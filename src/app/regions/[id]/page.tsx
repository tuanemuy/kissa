interface Props {
  params: Promise<{ id: string }>;
}

export default async function RegionPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <h1>Region {id}</h1>
      <p>Region page - to be implemented</p>
    </div>
  );
}
