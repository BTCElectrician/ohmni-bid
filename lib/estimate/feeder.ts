import type { ConduitPricing, FeederCalculation, WirePricing } from './types';

export function calculateFeederPrice(
  wire: WirePricing,
  conduit: ConduitPricing,
  conductorCount: number,
  ampacityMultiplier: number
): { materialCostPer100ft: number; laborHoursPer100ft: number } {
  const wireCostPer100ft = (wire.materialCostPer1000ft * conductorCount) / 10;
  const conduitCostPer100ft = conduit.materialCostPer100ft;
  const materialCostPer100ft = (wireCostPer100ft + conduitCostPer100ft) * ampacityMultiplier;

  const wireLaborPer100ft = (wire.laborHoursPer1000ft * conductorCount) / 10;
  const conduitLaborPer100ft = conduit.laborHoursPer100ft;
  const laborHoursPer100ft = (wireLaborPer100ft + conduitLaborPer100ft) * ampacityMultiplier;

  return { materialCostPer100ft, laborHoursPer100ft };
}

export function calculateFeederRun(
  wire: WirePricing,
  conduit: ConduitPricing,
  conductorCount: number,
  lengthFeet: number,
  ampacityMultiplier: number
): FeederCalculation {
  const unitPrices = calculateFeederPrice(
    wire,
    conduit,
    conductorCount,
    ampacityMultiplier
  );

  const materialCost = (unitPrices.materialCostPer100ft * lengthFeet) / 100;
  const laborHours = (unitPrices.laborHoursPer100ft * lengthFeet) / 100;

  return {
    materialCost,
    laborHours,
    description: `${lengthFeet}' of ${conductorCount}-${wire.size} ${wire.material} in ${conduit.size}" ${conduit.typeName}`
  };
}
