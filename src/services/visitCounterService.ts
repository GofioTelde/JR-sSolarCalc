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
    // 1. Get the current count (with better error handling)
    const { data, error: fetchError } = await supabase
      .from("visit_counter")
      .select("count_esolar, id")
      .limit(1);

    if (fetchError) {
      console.error("Error fetching visit counter:", fetchError);
      return null;
    }

    if (!data || data.length === 0) {
      console.error("No visit counter record found. Creating one...");
      // Create the first record if it doesn't exist
      const { data: createData, error: createError } = await supabase
        .from("visit_counter")
        .insert({ count_esolar: 1, updated_at: new Date().toISOString() })
        .select("count_esolar")
        .single();

      if (createError) {
        console.error("Error creating visit counter:", createError);
        return null;
      }

      return {
        count: createData?.count_esolar || 1,
        lastUpdated: new Date().toISOString(),
      };
    }

    const currentRecord = data[0];
    const currentCount = currentRecord.count_esolar || 0;
    const newCount = currentCount + 1;
    const recordId = currentRecord.id;

    // 2. Update the counter
    const { error: updateError } = await supabase
      .from("visit_counter")
      .update({
        count_esolar: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    if (updateError) {
      console.error("Error updating visit counter:", updateError);
      return null;
    }

    console.log(`Visit counter updated from ${currentCount} to ${newCount}`);
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
