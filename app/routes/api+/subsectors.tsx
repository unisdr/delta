import { LoaderFunctionArgs } from '@remix-run/node';
import { getSubSectorsBySectorId } from '~/db/queries/sector';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const sectorId = url.searchParams.get('sectorId');
  if (!sectorId) return { subSectors: [] };

  const subSectors = await getSubSectorsBySectorId(sectorId);
  return { subSectors };
}
