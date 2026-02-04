import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  // セキュリティ設定（後で部員のみに絞る設定をここに追加できます）
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };