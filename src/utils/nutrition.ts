import { ActivityLevel, FitnessGoal, Gender } from '../types';

export interface NutritionProfile {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: Gender;
  activity_level: ActivityLevel;
  goal: FitnessGoal;
}

export interface MacroTargets {
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_carbs_target: number;
  daily_fat_target: number;
}

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 */
export const calculateBMR = (
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number => {
  const baseBMR = 10 * weight + 6.25 * height - 5 * age;
  return gender === Gender.MALE ? baseBMR + 5 : baseBMR - 161;
};

/**
 * Get activity multiplier
 */
export const getActivityMultiplier = (level: ActivityLevel): number => {
  const multipliers = {
    [ActivityLevel.SEDENTARY]: 1.2,
    [ActivityLevel.LIGHT]: 1.375,
    [ActivityLevel.MODERATE]: 1.55,
    [ActivityLevel.ACTIVE]: 1.725,
    [ActivityLevel.VERY_ACTIVE]: 1.9
  };
  return multipliers[level];
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export const calculateTDEE = (bmr: number, activityLevel: ActivityLevel): number => {
  return Math.round(bmr * getActivityMultiplier(activityLevel));
};

/**
 * Adjust calories based on fitness goal
 */
export const adjustForGoal = (tdee: number, goal: FitnessGoal): number => {
  const adjustments = {
    [FitnessGoal.WEIGHT_LOSS]: -500,
    [FitnessGoal.MAINTENANCE]: 0,
    [FitnessGoal.BULKING]: 400,
    [FitnessGoal.MUSCLE_GAIN]: 250
  };
  return Math.round(tdee + adjustments[goal]);
};

/**
 * Calculate macro distribution
 */
export const calculateMacros = (
  calories: number,
  goal: FitnessGoal
): Omit<MacroTargets, 'daily_calorie_target'> => {
  let proteinPercent: number;
  let carbsPercent: number;
  let fatPercent: number;

  switch (goal) {
    case FitnessGoal.WEIGHT_LOSS:
      proteinPercent = 0.35;
      carbsPercent = 0.30;
      fatPercent = 0.35;
      break;
    case FitnessGoal.BULKING:
    case FitnessGoal.MUSCLE_GAIN:
      proteinPercent = 0.30;
      carbsPercent = 0.45;
      fatPercent = 0.25;
      break;
    case FitnessGoal.MAINTENANCE:
    default:
      proteinPercent = 0.30;
      carbsPercent = 0.40;
      fatPercent = 0.30;
  }

  // Protein and carbs: 4 cal/g, Fat: 9 cal/g
  return {
    daily_protein_target: Math.round((calories * proteinPercent) / 4),
    daily_carbs_target: Math.round((calories * carbsPercent) / 4),
    daily_fat_target: Math.round((calories * fatPercent) / 9)
  };
};

/**
 * Calculate complete nutrition targets
 */
export const calculateNutritionTargets = (profile: NutritionProfile): MacroTargets => {
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activity_level);
  const dailyCalories = adjustForGoal(tdee, profile.goal);
  const macros = calculateMacros(dailyCalories, profile.goal);

  return {
    daily_calorie_target: dailyCalories,
    ...macros
  };
};

/**
 * Get recommended calorie range for a meal
 */
export const getMealCalorieRange = (
  dailyCalories: number,
  mealType: string
): { min: number; max: number } => {
  const ranges: Record<string, { percent: number }> = {
    breakfast: { percent: 0.25 },
    lunch: { percent: 0.35 },
    dinner: { percent: 0.30 },
    snacks: { percent: 0.10 }
  };

  const range = ranges[mealType.toLowerCase()] || { percent: 0.25 };
  const targetCalories = dailyCalories * range.percent;

  return {
    min: Math.round(targetCalories * 0.8),
    max: Math.round(targetCalories * 1.2)
  };
};

/**
 * Classify meal recommendation
 */
export const classifyMeal = (
  mealCalories: number,
  dailyCalories: number,
  mealType: string
): 'RECOMMENDED' | 'CLOSE_MATCH' | 'NOT_RECOMMENDED' => {
  const range = getMealCalorieRange(dailyCalories, mealType);

  if (mealCalories <= range.max) {
    return 'RECOMMENDED';
  } else if (mealCalories <= range.max * 1.25) {
    return 'CLOSE_MATCH';
  } else {
    return 'NOT_RECOMMENDED';
  }
};
