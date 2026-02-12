/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { DataPlanResult, PowerPlanResult, ShowEvent, ThemeSettings, Wall, WallTotals } from "@/lib/domain/types";

interface Props {
  show: ShowEvent;
  wall: Wall;
  totals: WallTotals;
  dataPlan: DataPlanResult;
  powerPlan: PowerPlanResult;
  theme: ThemeSettings;
  revisionNotes: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    color: "#0f172a"
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingBottom: 8
  },
  titleBlock: {
    width: "72%"
  },
  title: {
    fontSize: 15,
    marginBottom: 2
  },
  subtitle: {
    fontSize: 9,
    marginBottom: 1
  },
  logo: {
    width: 100,
    height: 38,
    objectFit: "contain"
  },
  section: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 6,
    borderRadius: 2
  },
  sectionTitle: {
    fontSize: 11,
    marginBottom: 4
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    marginBottom: 2,
    paddingBottom: 2
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 2
  },
  cell: {
    flex: 1
  }
});

export function CrewPacketDocument({ show, wall, totals, dataPlan, powerPlan, theme, revisionNotes }: Props) {
  return (
    <Document title={`${wall.name}-deployment-sheet`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: theme.primaryColor }]}>{theme.brandName}</Text>
            <Text style={styles.subtitle}>Show: {show.showName}</Text>
            <Text style={styles.subtitle}>Date: {show.showDate}</Text>
            <Text style={styles.subtitle}>Venue: {show.venue}</Text>
            <Text style={styles.subtitle}>Wall: {wall.name}</Text>
            <Text style={styles.subtitle}>Deployment: {wall.deploymentType === "FLOWN" ? "Flown" : "Ground Stack"}</Text>
            <Text style={styles.subtitle}>Voltage: {wall.voltageMode}V</Text>
            <Text style={styles.subtitle}>Revision: {show.revision}</Text>
          </View>
          {theme.logoDataUrl ? <Image src={theme.logoDataUrl} style={styles.logo} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary Totals</Text>
          <View style={styles.row}>
            <Text>Wall Size (m)</Text>
            <Text>
              {totals.widthMeters.toFixed(2)} x {totals.heightMeters.toFixed(2)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Wall Size (ft)</Text>
            <Text>
              {totals.widthFeet.toFixed(2)} x {totals.heightFeet.toFixed(2)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Total Cabinets</Text>
            <Text>{totals.totalCabinets}</Text>
          </View>
          <View style={styles.row}>
            <Text>Wall Resolution</Text>
            <Text>
              {totals.wallResolution.width} x {totals.wallResolution.height}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Total Pixels</Text>
            <Text>{totals.totalPixels.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text>Total Weight</Text>
            <Text>
              {totals.totalWeightKg.toFixed(1)} kg / {totals.totalWeightLbs.toFixed(1)} lbs
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Power Totals ({wall.voltageMode}V)</Text>
          <View style={styles.row}>
            <Text>Min</Text>
            <Text>
              {powerPlan.totalsWatts.min.toFixed(0)} W / {powerPlan.totalsAmps.min.toFixed(1)} A
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Typical</Text>
            <Text>
              {powerPlan.totalsWatts.typ.toFixed(0)} W / {powerPlan.totalsAmps.typ.toFixed(1)} A
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Max</Text>
            <Text>
              {powerPlan.totalsWatts.max.toFixed(0)} W / {powerPlan.totalsAmps.max.toFixed(1)} A
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Peak</Text>
            <Text>
              {powerPlan.totalsWatts.peak.toFixed(0)} W / {powerPlan.totalsAmps.peak.toFixed(1)} A
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Estimated Circuits</Text>
            <Text>{powerPlan.estimatedCircuitCount}</Text>
          </View>
          {powerPlan.strategy === "SOCAPEX" ? (
            <>
              <View style={styles.row}>
                <Text>Socapex Runs</Text>
                <Text>{powerPlan.socapexRunsRequired}</Text>
              </View>
              <View style={styles.row}>
                <Text>Socapex Circuits Used</Text>
                <Text>{powerPlan.socapexCircuitsUsed}</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mixed Cabinet Breakdown</Text>
          <View style={styles.tableHead}>
            <Text style={styles.cell}>Family</Text>
            <Text style={styles.cell}>Variant</Text>
            <Text style={styles.cell}>Count</Text>
            <Text style={styles.cell}>Weight kg/lbs</Text>
            <Text style={styles.cell}>Pixels</Text>
          </View>
          {totals.variantBreakdown.map((item) => (
            <View key={item.variantId} style={styles.tableRow}>
              <Text style={styles.cell}>{item.familyName}</Text>
              <Text style={styles.cell}>{item.variantName}</Text>
              <Text style={styles.cell}>{item.count}</Text>
              <Text style={styles.cell}>
                {item.weightKg.toFixed(1)} / {item.weightLbs.toFixed(1)}
              </Text>
              <Text style={styles.cell}>{item.pixels.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Run Table</Text>
          <View style={styles.tableHead}>
            <Text style={styles.cell}>Run</Text>
            <Text style={styles.cell}>Port</Text>
            <Text style={styles.cell}>Cabinets</Text>
            <Text style={styles.cell}>Jumpers</Text>
            <Text style={styles.cell}>Home Run</Text>
          </View>
          {dataPlan.runs.map((run) => (
            <View key={run.runNumber} style={styles.tableRow}>
              <Text style={styles.cell}>D{run.runNumber}</Text>
              <Text style={styles.cell}>{run.processorPort}</Text>
              <Text style={styles.cell}>{run.cabinetCount}</Text>
              <Text style={styles.cell}>{run.jumperCount}</Text>
              <Text style={styles.cell}>
                {run.estimatedHomeRunMeters.toFixed(1)}m / {run.estimatedHomeRunFeet.toFixed(1)}ft
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Power Circuit Table</Text>
          <View style={styles.tableHead}>
            <Text style={styles.cell}>Circuit</Text>
            <Text style={styles.cell}>Phase</Text>
            <Text style={styles.cell}>Typ W/A</Text>
            <Text style={styles.cell}>Max W/A</Text>
            <Text style={styles.cell}>Status</Text>
          </View>
          {powerPlan.circuits.map((circuit) => (
            <View key={circuit.circuitNumber} style={styles.tableRow}>
              <Text style={styles.cell}>{circuit.label}</Text>
              <Text style={styles.cell}>{circuit.phase}</Text>
              <Text style={styles.cell}>
                {circuit.watts.typ.toFixed(0)} / {circuit.amps.typ.toFixed(1)}
              </Text>
              <Text style={styles.cell}>
                {circuit.watts.max.toFixed(0)} / {circuit.amps.max.toFixed(1)}
              </Text>
              <Text style={styles.cell}>{circuit.overHardLimit ? "Hard" : circuit.overPlanning ? "Planning" : "OK"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagram Legend</Text>
          <Text>Data arrows: D# labels (source to wall path). Power arrows: P# labels (circuit source to wall).</Text>
          <Text>Deploy with data and power flow verified against rack location and deployment type.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revision Notes</Text>
          <Text>{revisionNotes || "R1: Initial deployment issue"}</Text>
        </View>
      </Page>
    </Document>
  );
}
