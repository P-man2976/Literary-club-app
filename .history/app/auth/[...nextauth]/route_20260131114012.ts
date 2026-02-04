import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    // ここで「部員のメアドかどうか」の判定ロジックを入れる
    async signIn({ user }) {
      const allowedDomain = "@gmail.com"; // 本番は大学や部員のドメインに
      if (user.email?.endsWith(allowedDomain)) {
        return true;
      }
      return false; // 条件に合わない人はログイン拒否
    },
  },
});

export { handler as GET, handler as POST };