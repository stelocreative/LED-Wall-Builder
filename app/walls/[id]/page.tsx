import { WallEditorClient } from "@/components/walls/wall-editor-client";
import { getReferenceData, getWallById, listWalls } from "@/lib/supabase/queries";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WallPage({ params }: Props) {
  const { id } = await params;
  const [reference, wall, wallOptions] = await Promise.all([getReferenceData(), getWallById(id), listWalls()]);

  if (!wall) {
    return (
      <main className="page-shell">
        <h1>Wall not found</h1>
      </main>
    );
  }

  return <WallEditorClient initialWall={wall} reference={reference} wallOptions={wallOptions} />;
}
