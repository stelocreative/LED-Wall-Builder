import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { DataPlanResult, PanelVariant, PowerPlanResult, ThemeSettings, Wall } from "@/lib/domain/types";

interface Props {
  wall: Wall;
  panelMap: Record<string, PanelVariant>;
  dataPlan: DataPlanResult;
  powerPlan: PowerPlanResult;
  theme: ThemeSettings;
  revisionNotes: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    color: "#0f172a"
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 8
  },
  titleBlock: {
    width: "70%"
  },
  title: {
    fontSize: 16,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 10,
    color: "#334155"
  },
  logo: {
    width: 96,
    height: 40,
    objectFit: "contain"
  },
  section: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 8,
    borderRadius: 3
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 6,
    color: "#0f172a"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 3,
    marginBottom: 3
  },
  cell: {
    flex: 1
  },
  diagramCell: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 2
  }
});

export function CrewPacketDocument({ wall, panelMap, dataPlan, powerPlan, theme, revisionNotes }: Props) {
  const totalWeight = wall.cabinets.reduce((sum, cabinet) => {
    const panel = panelMap[cabinet.panelVariantId];
    return sum + (panel?.weightKg ?? 0);
  }, 0);

  const panelCountByType = wall.cabinets.reduce<Record<string, number>>((acc, cabinet) => {
    acc[cabinet.panelVariantId] = (acc[cabinet.panelVariantId] ?? 0) + 1;
    return acc;
  }, {});

  const generationDate = new Date().toISOString().slice(0, 10);

  return (
    <Document title={`${wall.name}-crew-packet`}>
      <Page size="A4" style={[styles.page, { backgroundColor: "#ffffff" }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: theme.primaryColor }]}>{theme.brandName}</Text>
            <Text style={styles.subtitle}>Wall Deployment Packet</Text>
            <Text style={styles.subtitle}>Wall: {wall.name}</Text>
            <Text style={styles.subtitle}>Generated: {generationDate}</Text>
          </View>
          {theme.logoDataUrl ? <Image src={theme.logoDataUrl} style={styles.logo} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary Totals</Text>
          <View style={styles.row}>
            <Text>Wall Size</Text>
            <Text>
              {wall.widthMeters.toFixed(2)}m x {wall.heightMeters.toFixed(2)}m ({wall.widthUnits} x {wall.heightUnits} units)
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Total Cabinets</Text>
            <Text>{wall.cabinets.length}</Text>
          </View>
          <View style={styles.row}>
            <Text>Total Weight</Text>
            <Text>{totalWeight.toFixed(1)} kg</Text>
          </View>
          <View style={styles.row}>
            <Text>Data Pixels</Text>
            <Text>{dataPlan.totalPixels.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text>Power (Typ)</Text>
            <Text>
              {powerPlan.totalWatts.typ.toFixed(0)} W / {powerPlan.totalAmps.typ.toFixed(1)} A @ {powerPlan.voltage}V
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Panel Mix</Text>
            <Text>
              {Object.entries(panelCountByType)
                .map(([variant, count]) => `${variant}: ${count}`)
                .join(", ")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Routing Diagram (Arrows)</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.cell}>Port</Text>
            <Text style={styles.cell}>Rows</Text>
            <Text style={styles.cell}>Load</Text>
            <Text style={styles.cell}>Arrow</Text>
          </View>
          {dataPlan.blocks.map((block) => (
            <View key={`${block.portIndex}-${block.rowStart}`} style={styles.diagramCell}>
              <Text style={styles.cell}>P{block.portIndex + 1}</Text>
              <Text style={styles.cell}>
                {block.rowStart + 1} {"->"} {block.rowEnd + 1}
              </Text>
              <Text style={styles.cell}>{block.pixelLoad.toLocaleString()} px</Text>
              <Text style={styles.cell}>
                {block.cableOrigin === "ground" ? "Ground -> Wall" : "Air -> Wall"}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Power Routing Diagram (Arrows)</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.cell}>Circuit</Text>
            <Text style={styles.cell}>Phase</Text>
            <Text style={styles.cell}>Typ W/A</Text>
            <Text style={styles.cell}>Arrow</Text>
          </View>
          {powerPlan.circuits.map((circuit) => (
            <View key={circuit.circuitNumber} style={styles.diagramCell}>
              <Text style={styles.cell}>C{circuit.circuitNumber}</Text>
              <Text style={styles.cell}>{circuit.phaseLabel}</Text>
              <Text style={styles.cell}>
                {circuit.watts.typ.toFixed(0)}W / {circuit.amps.typ.toFixed(1)}A
              </Text>
              <Text style={styles.cell}>{wall.riggingMode === "ground" ? "Source -> Ground" : "Source -> Air"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revision Notes</Text>
          <Text>{revisionNotes || "R1: Initial release"}</Text>
        </View>
      </Page>
    </Document>
  );
}
