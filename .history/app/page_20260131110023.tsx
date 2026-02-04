export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50">
      <h1 className="text-4xl font-bold text-slate-900 mb-4">
        文芸部 投稿ポータル
      </h1>
      <p className="text-lg text-slate-600 mb-8">
        今週のお題： 
      </p>
      <div className="flex gap-4">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium">
          ログインして投稿する
        </button>
        <button className="px-6 py-2 border border-slate-300 rounded-lg font-medium">
          作品を閲覧する
        </button>
      </div>
    </main>
  );
}