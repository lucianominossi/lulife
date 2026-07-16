import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { previewImport, userHasData } from "@/lib/import/xlsx";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const preview = await previewImport(buffer);
    const hasData = await userHasData(session.user.id);
    return NextResponse.json({ preview, hasData });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Não foi possível ler a planilha" },
      { status: 400 },
    );
  }
}
