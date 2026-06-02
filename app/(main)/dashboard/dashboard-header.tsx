import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JoinClassDialog from "./join-class-dialog";
import { Dispatch, SetStateAction } from "react";

type ChildProps = {
    setFilter: Dispatch<SetStateAction<string>>;
}

export default function DashboardHeader({ setFilter }: ChildProps){
    return(
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Track your progress and continue reviewing.
          </p>
        </div>

        {/* Filtering and Join class */}
        <div className="flex items-center gap-3">
          <Select onValueChange={(value) => setFilter(value)} defaultValue="all">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        {/*!--
          <JoinClassDialog/>-->*/}
        </div>
      </div>
    )
}