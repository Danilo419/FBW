import { prisma } from "@/lib/prisma";

/**
 * Tenta descobrir automaticamente qual é o model/tabela de comentários/reviews.
 * Ajusta esta lista conforme o teu projeto (se souberes o nome certo).
 */
const CANDIDATE_DELEGATES = [
  "comment",
  "comments",
  "review",
  "reviews",
  "productReview",
  "productReviews",
  "productComment",
  "productComments",
  "feedback",
  "testimony",
];

type Delegate = {
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
  delete: (args: any) => Promise<any>;
  deleteMany: (args: any) => Promise<any>;
};

function getPrismaAny() {
  return prisma as any;
}

export function getCommentsDelegateOrNull(): { key: string; delegate: Delegate } | null {
  const p = getPrismaAny();
  for (const key of CANDIDATE_DELEGATES) {
    if (p?.[key] && typeof p[key]?.findMany === "function") {
      return { key, delegate: p[key] as Delegate };
    }
  }
  return null;
}

export function pickCommentTextField(comment: any): string {
  return (
    comment?.text ??
    comment?.content ??
    comment?.message ??
    comment?.body ??
    comment?.comment ??
    ""
  );
}
