import { WallEditorClient } from "@/components/walls/wall-editor-client";
import { getWallBundleById, getBootstrapData } from "@/lib/supabase/queries";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WallPage({ params }: Props) {
  const { id } = await params;
  const [bundle, bootstrap] = await Promise.all([getWallBundleById(id), getBootstrapData()]);

  if (!bundle) {
    return (
      <main className="page-shell">
        <h1>Wall not found</h1>
      </main>
    );
  }

  return (
    <WallEditorClient
      wallBundle={bundle}
      families={bootstrap.families}
      variants={bootstrap.variants}
      processors={bootstrap.processors}
      shows={bootstrap.shows}
      receivingCards={bootstrap.receivingCards}
    />
  );
}
