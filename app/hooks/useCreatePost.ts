import useSWRMutation from "swr/mutation";

async function createPostFn(
  url: string,
  { arg }: { arg: Record<string, unknown> }
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "投稿に失敗しました");
  }
  return res.json();
}

export function useCreatePost() {
  return useSWRMutation("/api/posts", createPostFn);
}
