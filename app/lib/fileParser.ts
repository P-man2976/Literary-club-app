import type { Post } from "@/app/types/post";

export async function parseFile(
  file: File,
  setNewPost: React.Dispatch<React.SetStateAction<Partial<Post>>>
) {
  const fileName = file.name.replace(/\.[^/.]+$/, "");

  try {
    if (file.type === "text/plain") {
      const text = await file.text();
      setNewPost((prev) => ({ ...prev, title: fileName, body: text }));
    } else if (file.type === "application/pdf") {
      const PDFJS = await import("pdfjs-dist");
      PDFJS.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${PDFJS.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = PDFJS.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        let lastY = -1;
        let pageText = "";
        for (const item of textContent.items as Array<{
          str?: string;
          transform: number[];
        }>) {
          if (!item.str) continue;

          const currentY = item.transform[5];
          if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
            pageText += "\n";
          } else if (
            lastY !== -1 &&
            pageText.length > 0 &&
            !pageText.endsWith(" ")
          ) {
            pageText += " ";
          }
          pageText += item.str;
          lastY = currentY;
        }

        text += pageText + "\n";
      }

      setNewPost((prev) => ({ ...prev, title: fileName, body: text }));
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const JSZip = (await import("jszip")).default;

      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(arrayBuffer);
      const xml = await loadedZip.file("word/document.xml")?.async("text");

      if (xml) {
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        const paragraphs = doc.getElementsByTagName("w:p");
        let text = "";

        const readNodeText = (node: Node): string => {
          const name = node.nodeName;
          if (name === "w:t") return node.textContent || "";
          if (name === "w:tab") return "\t";
          if (name === "w:br" || name === "w:cr") return "\n";

          let out = "";
          node.childNodes.forEach((child) => {
            out += readNodeText(child);
          });
          return out;
        };

        for (let i = 0; i < paragraphs.length; i++) {
          const paragraph = paragraphs[i];
          text += readNodeText(paragraph);
          if (i < paragraphs.length - 1) {
            text += "\n";
          }
        }

        setNewPost((prev) => ({
          ...prev,
          title: fileName,
          body: text || "DOCX解析に失敗しました",
        }));
      } else {
        setNewPost((prev) => ({
          ...prev,
          title: fileName,
          body: "DOCX解析に失敗しました",
        }));
      }
    }
  } catch (error) {
    console.error("ファイル解析エラー:", error);
    alert("ファイルの解析に失敗しました");
  }
}
