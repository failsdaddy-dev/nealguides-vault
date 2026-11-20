import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BrowseView } from "@/components/browse-view";
import { GridSkeleton } from "@/components/states";
import { findSection } from "@/lib/hub-data";
import { TITLE_SUFFIX } from "@/lib/brand";

async function SectionBrowse({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const s = await findSection(section);
  if (!s) notFound();
  return (
    <>
      <title>{`${s.name}${TITLE_SUFFIX}`}</title>
      <BrowseView section={s} />
    </>
  );
}

export default function SectionPage({ params }: PageProps<"/[section]">) {
  return (
    <Suspense
      fallback={
        <div className="px-6 pt-16 max-sm:px-0">
          <GridSkeleton />
        </div>
      }
    >
      <SectionBrowse params={params} />
    </Suspense>
  );
}
