import type { TreeNode } from "primereact/treenode";
import { PartialDivision } from "~/backend.server/models/division";

/**
 * Converts a flat list of divisions into a nested PrimeReact TreeNode[] structure.
 * Uses the English ("en") name, handling both stringified and already-parsed JSON.
 */
export function buildPrimeReactTreeNodes(divisions: PartialDivision[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const div of divisions) {
    let parsedName: string;

    if (typeof div.name === "string") {
      // name is a string (might be JSON)
      try {
        const nameObj = JSON.parse(div.name);
        parsedName = nameObj?.en ?? div.name;
      } catch {
        parsedName = div.name;
      }
    } else if (typeof div.name === "object" && div.name !== null) {
      // name is already an object
      parsedName = (div.name as Record<string, string>).en ?? "";
    } else {
      parsedName = "";
    }

    nodeMap.set(div.id, {
      key: div.id,
      label: parsedName,
      data: div,
      children: [],
    });
  }

  for (const div of divisions) {
    const node = nodeMap.get(div.id)!;
    if (div.parentId) {
      const parentNode = nodeMap.get(div.parentId);
      if (parentNode) {
        parentNode.children!.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}
