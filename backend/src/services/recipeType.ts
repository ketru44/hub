export type RecipeType = "OWNED" | "EXTERNAL" | "RECEIVED";

export type EditableRecipeType = Exclude<RecipeType, "RECEIVED">;
