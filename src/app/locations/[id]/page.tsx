interface Props {
  params: Promise<{ id: string }>;
}

export default async function LocationPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <h1>Location {id}</h1>
      <p>Location page - to be implemented</p>
    </div>
  );
}
