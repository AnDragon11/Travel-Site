import { useMemo } from "react";
import { SavedTrip } from "@/lib/tripTypes";
import { BuilderActivity, BuilderDay } from "@/lib/builderTypes";
import {
  SLOT_WIDTH, SLOT_HEIGHT, GAP, PADDING, ROW_HEIGHT, ARC_RADIUS, TOP_OFFSET,
  BOND_COLORS, BOND_COLOR_HEX,
} from "@/lib/builderConstants";

interface RowData {
  dayIndex: number;
  slots: (BuilderActivity | "add")[];
  isFirstRowOfDay: boolean;
  rowIndexInDay: number;
  day: BuilderDay;
}

export function useSnakeCanvas(trip: SavedTrip, containerWidth: number) {
  const availableWidth = containerWidth - PADDING * 2;
  const SLOT_WITH_GAP = SLOT_WIDTH + GAP;
  const slotsPerRow = Math.max(1, Math.floor((availableWidth + GAP) / SLOT_WITH_GAP));

  // Bond color map: assigns a consistent color per bonded pair (flight or hotel)
  const bondColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const airlineColors: Record<string, string> = {};
    let idx = 0;
    for (const day of trip.days) {
      for (const act of day.activities) {
        if (act.is_arrival && act.flight_bond_id && !map[act.flight_bond_id]) {
          const airline = act.airline?.trim() ?? "";
          if (airline && airlineColors[airline]) {
            map[act.flight_bond_id] = airlineColors[airline];
          } else {
            const color = BOND_COLORS[idx % BOND_COLORS.length];
            map[act.flight_bond_id] = color;
            if (airline) airlineColors[airline] = color;
            idx++;
          }
        }
        if (act.is_checkout && act.hotel_bond_id && !map[act.hotel_bond_id]) {
          map[act.hotel_bond_id] = BOND_COLORS[idx % BOND_COLORS.length];
          idx++;
        }
      }
    }
    return map;
  }, [trip.days]);

  const allRows = useMemo(() => {
    const rows: RowData[] = [];
    trip.days.forEach((day, dayIndex) => {
      const allSlots: (BuilderActivity | "add")[] = [...day.activities, "add"];
      const dayRows: (BuilderActivity | "add")[][] = [];
      for (let i = 0; i < allSlots.length; i += slotsPerRow) {
        dayRows.push(allSlots.slice(i, i + slotsPerRow));
      }
      dayRows.forEach((rowSlots, ri) => {
        rows.push({ dayIndex, slots: rowSlots, isFirstRowOfDay: ri === 0, rowIndexInDay: ri, day });
      });
    });
    return rows;
  }, [trip.days, slotsPerRow]);

  const getRowWidth = (n: number) => n * SLOT_WIDTH + Math.max(0, n - 1) * GAP;

  const rowLayouts = useMemo(() => {
    return allRows.map((row, rowIndex) => {
      const isRTL = row.rowIndexInDay % 2 === 1;
      const slotCount = row.slots.length;
      const rowWidth = getRowWidth(slotCount);
      const rowLeft = isRTL ? PADDING + availableWidth - rowWidth : PADDING;
      const yCenter = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + TOP_OFFSET;
      const top = rowIndex * ROW_HEIGHT + (ROW_HEIGHT - SLOT_HEIGHT) / 2 + TOP_OFFSET;
      const startEdgeX = isRTL ? PADDING + availableWidth : PADDING;
      const endEdgeX = isRTL ? PADDING + availableWidth - rowWidth : PADDING + rowWidth;
      return { ...row, rowIndex, slotCount, rowWidth, rowLeft, yCenter, top, startEdgeX, endEdgeX, isRTL };
    });
  }, [allRows, containerWidth, availableWidth]);

  const svgHeight = allRows.length * ROW_HEIGHT + TOP_OFFSET;

  const snakePath = useMemo(() => {
    if (rowLayouts.length === 0) return "";
    const R = ARC_RADIUS;
    const parts: string[] = [];
    rowLayouts.forEach((row, idx) => {
      if (row.slotCount === 0) return;
      if (idx === 0) {
        const badgeCx = containerWidth / 2;
        const badgeCenterY = TOP_OFFSET / 2;
        parts.push(`M ${badgeCx} ${badgeCenterY}`);
        parts.push(`L ${PADDING} ${badgeCenterY}`);
        parts.push(`A ${R} ${R} 0 0 0 ${PADDING - R} ${badgeCenterY + R}`);
        parts.push(`L ${PADDING - R} ${row.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 0 ${PADDING} ${row.yCenter}`);
      }
      parts.push(`L ${row.endEdgeX} ${row.yCenter}`);
      const next = rowLayouts[idx + 1];
      if (!next || next.slotCount === 0) return;
      const gapY = (row.yCenter + next.yCenter) / 2;
      const leftEdge = PADDING;
      const rightEdge = PADDING + availableWidth;

      if (!row.isRTL && next.isRTL) {
        parts.push(`L ${rightEdge} ${row.yCenter}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge + R} ${row.yCenter + R}`);
        parts.push(`L ${rightEdge + R} ${next.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge} ${next.yCenter}`);
      } else if (!row.isRTL && !next.isRTL) {
        parts.push(`L ${rightEdge} ${row.yCenter}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge + R} ${row.yCenter + R}`);
        parts.push(`L ${rightEdge + R} ${gapY - R}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge} ${gapY}`);
        parts.push(`L ${leftEdge} ${gapY}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge - R} ${gapY + R}`);
        parts.push(`L ${leftEdge - R} ${next.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge} ${next.yCenter}`);
      } else if (row.isRTL && !next.isRTL) {
        parts.push(`L ${leftEdge} ${row.yCenter}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge - R} ${row.yCenter + R}`);
        parts.push(`L ${leftEdge - R} ${next.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge} ${next.yCenter}`);
      } else {
        parts.push(`L ${leftEdge} ${row.yCenter}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge - R} ${row.yCenter + R}`);
        parts.push(`L ${leftEdge - R} ${gapY - R}`);
        parts.push(`A ${R} ${R} 0 0 0 ${leftEdge} ${gapY}`);
        parts.push(`L ${rightEdge} ${gapY}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge + R} ${gapY + R}`);
        parts.push(`L ${rightEdge + R} ${next.yCenter - R}`);
        parts.push(`A ${R} ${R} 0 0 1 ${rightEdge} ${next.yCenter}`);
      }
    });
    return parts.join(" ");
  }, [rowLayouts, containerWidth, availableWidth]);

  // Colored path segments for active hotel stays and flights (check-in → checkout, departure → arrival)
  const hotelStayPaths = useMemo(() => {
    if (rowLayouts.length === 0) return [];
    const R = ARC_RADIUS;
    const leftEdge = PADDING;
    const rightEdge = PADDING + availableWidth;
    const step = SLOT_WIDTH + GAP;

    const cardCenterX = (row: typeof rowLayouts[0], slotIdx: number) =>
      row.isRTL
        ? PADDING + availableWidth - slotIdx * step - SLOT_WIDTH / 2
        : PADDING + slotIdx * step + SLOT_WIDTH / 2;

    const allActs = trip.days.flatMap(d => d.activities);
    const results: { path: string; color: string }[] = [];

    const isFlightType = (a: BuilderActivity) =>
      (a.type === "transport" && a.subtype === "flight") || a.type === "flight";

    allActs.forEach(act => {
      const isHotelCheckin = act.type === "accommodation" && !act.is_checkout;
      const isFlightDep    = isFlightType(act) && !act.is_arrival;
      if (!isHotelCheckin && !isFlightDep) return;

      const colorKey = bondColorMap[act.id];
      if (!colorKey) return;

      const partner = isHotelCheckin
        ? allActs.find(x => x.is_checkout && x.hotel_bond_id === act.id)
        : allActs.find(x => x.is_arrival  && x.flight_bond_id === act.id);
      if (!partner) return;

      let checkInRowIdx = -1, checkInSlotIdx = -1;
      let checkOutRowIdx = -1, checkOutSlotIdx = -1;
      rowLayouts.forEach((row, ri) => {
        row.slots.forEach((slot, si) => {
          if (slot === "add") return;
          if ((slot as BuilderActivity).id === act.id)      { checkInRowIdx = ri;  checkInSlotIdx = si; }
          if ((slot as BuilderActivity).id === partner.id)  { checkOutRowIdx = ri; checkOutSlotIdx = si; }
        });
      });
      if (checkInRowIdx === -1 || checkOutRowIdx === -1) return;

      const rowA = rowLayouts[checkInRowIdx];
      const rowB = rowLayouts[checkOutRowIdx];
      const startX = cardCenterX(rowA, checkInSlotIdx);
      const endX   = cardCenterX(rowB, checkOutSlotIdx);
      const parts: string[] = [];

      parts.push(`M ${startX} ${rowA.yCenter}`);

      if (checkInRowIdx === checkOutRowIdx) {
        parts.push(`L ${endX} ${rowA.yCenter}`);
      } else {
        parts.push(`L ${rowA.endEdgeX} ${rowA.yCenter}`);
        for (let i = checkInRowIdx; i < checkOutRowIdx; i++) {
          const row  = rowLayouts[i];
          const next = rowLayouts[i + 1];
          const gapY = (row.yCenter + next.yCenter) / 2;
          if (!row.isRTL && next.isRTL) {
            parts.push(`L ${rightEdge} ${row.yCenter}`);
            parts.push(`A ${R} ${R} 0 0 1 ${rightEdge + R} ${row.yCenter + R}`);
            parts.push(`L ${rightEdge + R} ${next.yCenter - R}`);
            parts.push(`A ${R} ${R} 0 0 1 ${rightEdge} ${next.yCenter}`);
          } else if (!row.isRTL && !next.isRTL) {
            parts.push(`L ${rightEdge} ${row.yCenter}`);
            parts.push(`A ${R} ${R} 0 0 1 ${rightEdge + R} ${row.yCenter + R}`);
            parts.push(`L ${rightEdge + R} ${gapY - R}`);
            parts.push(`A ${R} ${R} 0 0 1 ${rightEdge} ${gapY}`);
            parts.push(`L ${leftEdge} ${gapY}`);
            parts.push(`A ${R} ${R} 0 0 0 ${leftEdge - R} ${gapY + R}`);
            parts.push(`L ${leftEdge - R} ${next.yCenter - R}`);
            parts.push(`A ${R} ${R} 0 0 0 ${leftEdge} ${next.yCenter}`);
          } else if (row.isRTL && !next.isRTL) {
            parts.push(`L ${leftEdge} ${row.yCenter}`);
            parts.push(`A ${R} ${R} 0 0 0 ${leftEdge - R} ${row.yCenter + R}`);
            parts.push(`L ${leftEdge - R} ${next.yCenter - R}`);
            parts.push(`A ${R} ${R} 0 0 0 ${leftEdge} ${next.yCenter}`);
          } else {
            parts.push(`L ${leftEdge} ${row.yCenter}`);
            parts.push(`A ${R} ${R} 0 0 0 ${leftEdge - R} ${row.yCenter + R}`);
            parts.push(`L ${leftEdge - R} ${gapY - R}`);
            parts.push(`A ${R} ${R} 0 0 0 ${leftEdge} ${gapY}`);
            parts.push(`L ${rightEdge} ${gapY}`);
            parts.push(`A ${R} ${R} 0 0 1 ${rightEdge + R} ${gapY + R}`);
            parts.push(`L ${rightEdge + R} ${next.yCenter - R}`);
            parts.push(`A ${R} ${R} 0 0 1 ${rightEdge} ${next.yCenter}`);
          }
          // Traverse intermediate row fully
          if (i + 1 < checkOutRowIdx) {
            parts.push(`L ${rowLayouts[i + 1].endEdgeX} ${rowLayouts[i + 1].yCenter}`);
          }
        }
        parts.push(`L ${endX} ${rowB.yCenter}`);
      }
      results.push({ path: parts.join(" "), color: BOND_COLOR_HEX[colorKey] ?? '#34d399' });
    });
    return results;
  }, [rowLayouts, trip.days, bondColorMap, availableWidth]);

  // Day badge positions (between rows when day changes; Day 1 at top center)
  const dayBadgePositions = useMemo(() => {
    const positions: { x: number; y: number; day: BuilderDay }[] = [];
    rowLayouts.forEach((row, idx) => {
      if (!row.isFirstRowOfDay) return;
      if (row.dayIndex === 0) {
        positions.push({ x: containerWidth / 2, y: TOP_OFFSET / 2, day: row.day });
      } else {
        const prev = rowLayouts[idx - 1];
        if (!prev) return;
        positions.push({ x: containerWidth / 2, y: (prev.yCenter + row.yCenter) / 2, day: row.day });
      }
    });
    return positions;
  }, [rowLayouts, containerWidth]);

  return {
    rowLayouts,
    snakePath,
    hotelStayPaths,
    dayBadgePositions,
    svgHeight,
    bondColorMap,
    availableWidth,
    slotsPerRow,
  };
}
