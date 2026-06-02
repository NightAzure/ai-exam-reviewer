import { usePathname } from "next/navigation";

export function useIsActive() {
  const pathname = usePathname();

  return (path: string, courseId?: number | null) => {
    if (courseId) {
      const courseBasePath = `/course/${courseId}`;
      return pathname === courseBasePath + path;
    }

    return pathname === path || pathname.startsWith(path + "/");
  };
}
