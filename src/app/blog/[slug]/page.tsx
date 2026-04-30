import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "../posts";
import PostClient from "@/app/design-v2/blog/[slug]/client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};

  return {
    title: `${post.title} | OneGoodArea Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `https://www.onegoodarea.com/blog/${post.slug}`,
      publishedTime: post.date,
      images: [{ url: `/blog/${slug}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
    alternates: { canonical: `https://www.onegoodarea.com/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const idx = BLOG_POSTS.findIndex((p) => p.slug === slug);
  const nextPost = idx > 0 ? BLOG_POSTS[idx - 1] : null;
  const prevPost = idx < BLOG_POSTS.length - 1 ? BLOG_POSTS[idx + 1] : null;

  return <PostClient post={post} prevPost={prevPost} nextPost={nextPost} />;
}
