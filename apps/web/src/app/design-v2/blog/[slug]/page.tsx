import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/app/blog/posts";
import PostClient from "./client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: "Post not found | OneGoodArea (Design V2)" };
  return {
    title: `${post.title} | OneGoodArea (Design V2)`,
    description: post.description,
    robots: { index: false, follow: false },
  };
}

export default async function DesignV2BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const idx = BLOG_POSTS.findIndex((p) => p.slug === slug);
  const nextPost = idx > 0 ? BLOG_POSTS[idx - 1] : null;
  const prevPost = idx < BLOG_POSTS.length - 1 ? BLOG_POSTS[idx + 1] : null;

  return <PostClient post={post} prevPost={prevPost} nextPost={nextPost} />;
}
