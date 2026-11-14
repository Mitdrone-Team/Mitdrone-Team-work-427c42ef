import { Badge } from '@mitdrone/ui';
import { formatMoney } from '@mitdrone/utils';
import { BadgeCheck, MapPin, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductPurchase } from '@/components/product/product-purchase';
import { RatingStars } from '@/components/product/rating-stars';
import { RentalRequest } from '@/components/product/rental-request';
import { ReviewsSection } from '@/components/product/reviews';
import { getBackendOfferAvailability, getCategories, getProduct, getProducts, getReviews } from '@/lib/data';
import { jsonLdString, productJsonLd, sanitizeDescription } from '@/lib/seo';

import type { Metadata } from 'next';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

/** Pre-render the top products at build time. Everything else renders on demand (ISR). */
export async function generateStaticParams() {
  const { data } = await getProducts({ pageSize: 24, sort: 'popular' });
  return data.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  const image = product.images[0];
  return {
    title: product.title,
    description: product.shortDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.title,
      description: product.shortDescription,
      ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  const categories = await getCategories();
  const category = categories.find((c) => c.id === product.categoryIds[0]);
  const [reviews, related, availability] = await Promise.all([
    getReviews(product.id, { pageSize: 5 }),
    category ? getProducts({ category: category.slug, pageSize: 5 }) : Promise.resolve(null),
    product.listingType === 'rent'
      ? getBackendOfferAvailability(product.id)
      : Promise.resolve(undefined),
  ]);
  const others = related?.data.filter((p) => p.id !== product.id).slice(0, 4) ?? [];
  const isRental = product.listingType === 'rent';

  return (
    <div className="container py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(productJsonLd(product, reviews.meta.total)),
        }}
      />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/products' },
          ...(category ? [{ label: category.name, href: `/categories/${category.slug}` }] : []),
          { label: product.title },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} title={product.title} />
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {product.condition !== 'new' ? (
                <Badge variant="secondary" className="capitalize">
                  {product.condition}
                </Badge>
              ) : null}
              {isRental ? <Badge>For rent</Badge> : null}
              <span className="text-muted-foreground text-sm">{product.brand}</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>
            <a href="#reviews" className="inline-block">
              <RatingStars rating={product.rating} count={reviews.meta.total} />
            </a>
            <p className="text-muted-foreground">{product.shortDescription}</p>
          </div>

          {isRental ? <RentalRequest product={product} availability={availability} /> : <ProductPurchase product={product} />}

          <ul className="bg-muted/40 space-y-3 rounded-xl border p-4 text-sm">
            <li className="flex gap-3">
              <ShieldCheck className="text-primary size-5 shrink-0" aria-hidden="true" /> Covered by
              Mitdrone Buyer Protection
            </li>
            <li className="flex gap-3">
              <Truck className="text-primary size-5 shrink-0" aria-hidden="true" />{' '}
              {product.vendor ? `Ships from ${product.vendor.city}. ` : ''}Tracked delivery
              nationwide
            </li>
            {product.compareAtPrice ? (
              <li className="flex gap-3">
                <BadgeCheck className="text-primary size-5 shrink-0" aria-hidden="true" /> Was{' '}
                {formatMoney(product.compareAtPrice)}
              </li>
            ) : null}
          </ul>

          {product.vendor ? (
            <Link
              href={`/vendors/${product.vendor.slug}`}
              className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors"
            >
              <span>
                <span className="flex items-center gap-1 font-medium">
                  Sold by {product.vendor.name}
                  {product.vendor.verified ? (
                    <BadgeCheck className="text-primary size-4" aria-label="Verified seller" />
                  ) : null}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {product.vendor.city}, {product.vendor.state}
                </span>
              </span>
              <RatingStars rating={product.vendor.rating} />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="desc-heading" className="space-y-4">
          <h2 id="desc-heading" className="text-2xl font-semibold tracking-tight">
            About this item
          </h2>
          <div
            className="space-y-3 text-sm leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: sanitizeDescription(product.description) }}
          />
        </section>
        <section aria-labelledby="spec-heading" className="space-y-4">
          <h2 id="spec-heading" className="text-2xl font-semibold tracking-tight">
            Details
          </h2>
          <dl className="divide-y rounded-xl border text-sm">
            {Object.entries({ SKU: product.inventory.sku, ...product.specs }).map(
              ([key, value]) => (
                <div key={key} className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ),
            )}
          </dl>
        </section>
      </div>

      <div className="mt-14">
        <ReviewsSection
          productId={product.id}
          slug={product.slug}
          rating={product.rating}
          count={reviews.meta.total}
          reviews={reviews.data}
        />
      </div>

      {others.length > 0 ? (
        <section aria-labelledby="related-heading" className="mt-14 space-y-6">
          <h2 id="related-heading" className="text-2xl font-semibold tracking-tight">
            You may also like
          </h2>
          <ProductGrid products={others} />
        </section>
      ) : null}
    </div>
  );
}
