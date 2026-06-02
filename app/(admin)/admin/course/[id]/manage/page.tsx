import ManageCoursePage from "./manage-course";
//TO BE TRANSFERED, TEMPORARY
export default async function ManageCourse({ params }: { params: Promise<{ id: string }> }) {
    const {id} = await params;
    return (
        <ManageCoursePage id={id}/>
    )
}
