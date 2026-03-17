import { FigureLibraryManager } from "@/features/admin/figures/figure-library-manager";
import { getFigureLibraryState } from "@/features/admin/figures/queries";

export default async function AdminFiguresPage() {
  const libraryState = await getFigureLibraryState();

  return <FigureLibraryManager {...libraryState} initialFigures={libraryState.figures} />;
}
