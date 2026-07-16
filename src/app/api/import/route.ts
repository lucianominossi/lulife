import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { importWorkbook, userHasData } from "@/lib/import/xlsx";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const replace = form.get("replace") === "1";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }

  const hasData = await userHasData(session.user.id);
  if (hasData && !replace) {
    return NextResponse.json(
      { error: "Já existem dados. Marque substituir para continuar." },
      { status: 409 },
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    await importWorkbook(session.user.id, buffer, replace);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha na importação" },
      { status: 500 },
    );
  }
}
