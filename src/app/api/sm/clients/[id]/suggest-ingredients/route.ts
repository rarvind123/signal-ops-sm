import { NextResponse } from "next/server";
import {
  formatIngredientsForMustInclude,
  researchBrandIngredients,
} from "@/lib/sm/brand-ingredient-research";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { getClient } from "@/lib/sm/store";

export const runtime = "nodejs";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const client = await getClient(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const ingredients = await researchBrandIngredients(client);
    if (ingredients.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not research ingredients for this brand. Enter key ingredients manually in Must include.",
        },
        { status: 422 }
      );
    }

    return {
      ingredients,
      must_include_suggestion: formatIngredientsForMustInclude(ingredients),
    };
  });
}
