export const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("データの取得に失敗しました");
    return res.json();
  });

export const profilesFetcher = ([url, emails]: [string, string[]]) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  }).then((res) => {
    if (!res.ok) throw new Error("プロフィール取得に失敗しました");
    return res.json();
  });
