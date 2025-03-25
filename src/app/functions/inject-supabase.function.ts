import { inject } from "@angular/core";
import { SupabaseService } from "../services/supabase/supabase.service"

export const InjectSupabase = () => {
    const supabaseService = inject(SupabaseService);
    return supabaseService.supabase;
};