'use client'

import useSWR from 'swr';
import { createClient } from '@/utils/supabase/client';
import { CourseRecord } from '@/types/course';
export function useCourses() {
    const supabase = createClient();
    return useSWR('courses', async () => {
        // 1. Alias the joined table to `instructor` to match the `Course` type.
        // 2. Select the `id` from the instructor's profile as required by the type.
        // Assuming 'instructor_id' is the foreign key column in your 'courses' table
        // that points to the 'profiles' table.
        const { data, error } = await supabase
            .from('courses')
            .select(`
                *,
                instructor:profiles!instructor_id(id, first_name, second_name)
            `);

        if (error) throw error;

        return data as CourseRecord[];
    });
}