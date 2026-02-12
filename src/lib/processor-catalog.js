export const PROCESSOR_LIBRARY = {
  mx20: {
    id: "mx20",
    name: "NovaStar MX20",
    ethernetPorts: 6,
    maxDevicePixels: 3900000
  },
  mx30: {
    id: "mx30",
    name: "NovaStar MX30",
    ethernetPorts: 10,
    maxDevicePixels: 6500000
  },
  mx40: {
    id: "mx40",
    name: "NovaStar MX40",
    ethernetPorts: 20,
    maxDevicePixels: 9000000
  }
};

export const RECEIVING_CARD_LIBRARY = {
  a8s: {
    id: "a8s",
    name: "A8s / Standard Armor Cards"
  },
  a10s: {
    id: "a10s",
    name: "A10s / A10s Pro Profile"
  }
};

export const COLOR_DEPTH_OPTIONS = {
  "8bit": {
    id: "8bit",
    name: "8-bit"
  },
  "10bit": {
    id: "10bit",
    name: "10-bit"
  }
};

export function getProcessorModel(processorModel = "mx30") {
  return PROCESSOR_LIBRARY[processorModel] || PROCESSOR_LIBRARY.mx30;
}

export function getReceivingCard(receivingCard = "a8s") {
  return RECEIVING_CARD_LIBRARY[receivingCard] || RECEIVING_CARD_LIBRARY.a8s;
}

export function getColorDepth(colorDepth = "10bit") {
  return COLOR_DEPTH_OPTIONS[colorDepth] || COLOR_DEPTH_OPTIONS["10bit"];
}

export function getPerPortPixelBudget({ colorDepth = "10bit", receivingCard = "a8s" } = {}) {
  if (colorDepth === "8bit") {
    return 659722;
  }

  if (receivingCard === "a10s") {
    return 494791;
  }

  return 329861;
}

export function getDataCapacity({
  processorModel = "mx30",
  colorDepth = "10bit",
  receivingCard = "a8s"
} = {}) {
  const processor = getProcessorModel(processorModel);
  const perPortPixelBudget = getPerPortPixelBudget({ colorDepth, receivingCard });

  return {
    processorId: processor.id,
    processorName: processor.name,
    ethernetPorts: processor.ethernetPorts,
    maxDevicePixels: processor.maxDevicePixels,
    perPortPixelBudget,
    colorDepth: getColorDepth(colorDepth).id,
    receivingCard: getReceivingCard(receivingCard).id
  };
}

export function getLayoutItemPixelLoad(layoutItem, cabinets) {
  const variant = cabinets.find((cabinet) => cabinet.id === layoutItem?.cabinet_id);
  if (!variant) {
    return 0;
  }
  return (variant.pixel_width || 0) * (variant.pixel_height || 0);
}

export function getWallPixelLoad(layout = [], cabinets = []) {
  return layout.reduce((sum, item) => sum + getLayoutItemPixelLoad(item, cabinets), 0);
}

export function getRunPixelLoad(run, layout = [], cabinets = []) {
  const path = Array.isArray(run?.path) ? run.path : [];
  return path.reduce((sum, layoutId) => {
    const layoutItem = layout.find((item) => item.id === layoutId);
    if (!layoutItem) {
      return sum;
    }
    return sum + getLayoutItemPixelLoad(layoutItem, cabinets);
  }, 0);
}

export function parsePortIndex(value) {
  const match = String(value || "").match(/(\d+)/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}
