import { getCurrentUser } from "@/lib/auth";
import { createContext } from "@/lib/context";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await createContext();
    const url = new URL(request.url);
    const format =
      (url.searchParams.get("format") as "json" | "csv" | "xml") || "json";

    const result = await context.privacyService.exportUserData(user, format);

    if (result.isErr()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    const exportData = result.value;
    const filename = `kissa-data-export-${user}-${new Date().toISOString().split("T")[0]}.${format}`;

    let contentType: string;
    let responseData: string;

    switch (format) {
      case "json":
        contentType = "application/json";
        responseData = JSON.stringify(exportData.dataTypes, null, 2);
        break;
      case "csv":
        contentType = "text/csv";
        responseData = convertToCSV(exportData.dataTypes);
        break;
      case "xml":
        contentType = "application/xml";
        responseData = convertToXML(exportData.dataTypes);
        break;
      default:
        contentType = "application/json";
        responseData = JSON.stringify(exportData.dataTypes, null, 2);
    }

    return new Response(responseData, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Export-Checksum": exportData.checksum,
        "X-Export-Size": exportData.size.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to export user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function convertToCSV(data: Record<string, unknown>): string {
  const rows: string[] = [];

  // Add header
  rows.push("Category,Field,Value");

  // Convert nested object to flat CSV
  function flattenObject(obj: unknown, prefix = ""): void {
    if (!obj || typeof obj !== "object") return;
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        flattenObject(value, fullKey);
      } else {
        const csvValue = Array.isArray(value)
          ? `"${value.join("; ")}"`
          : `"${String(value).replace(/"/g, '""')}"`;
        rows.push(`"${prefix}","${key}",${csvValue}`);
      }
    }
  }

  flattenObject(data);
  return rows.join("\n");
}

function convertToXML(data: Record<string, unknown>): string {
  function objectToXML(obj: unknown, rootName = "root"): string {
    if (!obj || typeof obj !== "object") return "";
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;

    function serialize(item: unknown, name: string): string {
      if (item === null || item === undefined) {
        return `  <${name}></${name}>\n`;
      }
      if (Array.isArray(item)) {
        return item.map((arrayItem) => serialize(arrayItem, name)).join("");
      }
      if (typeof item === "object") {
        let result = `  <${name}>\n`;
        for (const [key, value] of Object.entries(item)) {
          result += serialize(value, key).replace(/^ {2}/gm, "    ");
        }
        result += `  </${name}>\n`;
        return result;
      }
      const escapedValue = String(item)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      return `  <${name}>${escapedValue}</${name}>\n`;
    }

    for (const [key, value] of Object.entries(obj)) {
      xml += serialize(value, key);
    }

    xml += `</${rootName}>`;
    return xml;
  }

  return objectToXML(data, "userData");
}
