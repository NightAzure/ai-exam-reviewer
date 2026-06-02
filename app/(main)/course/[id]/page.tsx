import CourseContentPage from "./course";

export default async function Course({ params }: { params: Promise<{ id: string }> }) {
    const {id} = await params;
    return (
        <CourseContentPage id={parseInt(id)}/>
    )
}
