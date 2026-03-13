"use client";

interface TopicAnalysis {
  overview: string;
  strengths: string[];
  suggestions: string[];
  authorFeedback: Array<{
    author: string;
    praise: string;
    critique: string;
    nextStep: string;
  }>;
  postFeedback: Array<{
    postId: string;
    title: string;
    praise: string;
    critique: string;
    nextStep: string;
  }>;
}

interface AIAnalysisSectionProps {
  repliesCount: number;
  aiReadingEnabled: boolean;
  analysisLoading: boolean;
  analysisError: string | null;
  analysisResult: TopicAnalysis | null;
  onGenerate: () => void;
}

export function AIAnalysisSection({
  repliesCount,
  aiReadingEnabled,
  analysisLoading,
  analysisError,
  analysisResult,
  onGenerate,
}: AIAnalysisSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-2xl font-black uppercase tracking-wide text-black chrome:text-purple-300">
          AI講評
        </h3>
        <button
          onClick={onGenerate}
          disabled={analysisLoading || repliesCount === 0}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analysisLoading ? "生成中..." : "分析を生成"}
        </button>
      </div>

      {!aiReadingEnabled && (
        <p className="text-sm text-slate-500 chrome:text-slate-200">
          あなたの設定はOFFのため、あなたの投稿は講評対象から除外されます。
        </p>
      )}

      {repliesCount === 0 && (
        <p className="text-sm text-slate-500 chrome:text-slate-200">
          投稿が集まると分析できます。
        </p>
      )}

      {analysisError && (
        <p className="text-sm text-red-600 chrome:text-red-400">
          {analysisError}
        </p>
      )}

      {analysisResult && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-1">
              総評
            </p>
            <p className="text-sm text-slate-600 chrome:text-slate-100 whitespace-pre-wrap">
              {analysisResult.overview}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-1">
              良かった点
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600 chrome:text-slate-100 space-y-1">
              {analysisResult.strengths?.map((item, idx) => (
                <li key={`strength-${idx}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-1">
              改善提案
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600 chrome:text-slate-100 space-y-1">
              {analysisResult.suggestions?.map((item, idx) => (
                <li key={`suggestion-${idx}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-2">
              投稿者ごとの講評
            </p>
            <div className="space-y-2">
              {analysisResult.authorFeedback?.map((item, idx) => (
                <div
                  key={`author-${idx}`}
                  className="rounded-lg border border-slate-200 chrome:border-slate-700 p-3"
                >
                  <p className="text-sm font-bold text-slate-800 chrome:text-slate-100">
                    {item.author}
                  </p>
                  <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">
                    ほめる: {item.praise}
                  </p>
                  <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">
                    批評: {item.critique}
                  </p>
                  <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">
                    次の一歩: {item.nextStep}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-2">
              投稿ごとの講評
            </p>
            <div className="space-y-2">
              {analysisResult.postFeedback?.map((item, idx) => (
                <div
                  key={`post-${item.postId || idx}`}
                  className="rounded-lg border border-slate-200 chrome:border-slate-700 p-3"
                >
                  <p className="text-sm font-bold text-slate-800 chrome:text-slate-100">
                    {item.title}
                  </p>
                  <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">
                    ほめる: {item.praise}
                  </p>
                  <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">
                    批評: {item.critique}
                  </p>
                  <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">
                    次の一歩: {item.nextStep}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
