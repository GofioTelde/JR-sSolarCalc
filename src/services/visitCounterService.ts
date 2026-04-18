import { supabase } from "./supabaseClient";

export interface VisitCounterData {
  count: number;
  lastUpdated: string;
}

/**
 * Increments the visit counter in Supabase and returns the updated count.
 * The counter is stored in the "visit_counter" table, "count_esolar" column.
 */
export async function incrementVisitCounter(): Promise<VisitCounterData | null> {
  try {
    // 1. Get the current count
    const { data, error: fetchError } = await supabase
      .from("visit_counter")
      .select("count_esolar")
      .single();

    if (fetchError) {
      console.error("Error fetching visit counter:", fetchError);
      return null;
    }

    const currentCount = data?.count_esolar || 0;
    const newCount = currentCount + 1;

    // 2. Update the counter
    const { error: updateError } = await supabase
      .from("visit_counter")
      .update({
        count_esolar: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1); // Assuming the single row has id = 1

    if (updateError) {
      console.error("Error updating visit counter:", updateError);
      return null;
    }

    return {
      count: newCount,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Unexpected error in incrementVisitCounter:", error);
    return null;
  }
}

/**
 * Gets the current visit counter value from Supabase.
 */
export async function getVisitCounter(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("visit_counter")
      .select("count_esolar")
      .single();

    if (error) {
      console.error("Error fetching visit counter:", error);
      return 0;
    }

    return data?.count_esolar || 0;
  } catch (error) {
    console.error("Unexpected error in getVisitCounter:", error);
    return 0;
  }
}
