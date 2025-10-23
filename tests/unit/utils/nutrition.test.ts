import {
  calculateBMR,
  getActivityMultiplier,
  calculateTDEE,
  adjustForGoal,
  calculateMacros,
  calculateNutritionTargets,
  getMealCalorieRange,
  classifyMeal
} from '../../../src/utils/nutrition';
import { Gender, ActivityLevel, FitnessGoal } from '../../../src/types';

describe('Nutrition Utils', () => {
  describe('calculateBMR', () => {
    it('should calculate BMR correctly for males', () => {
      const bmr = calculateBMR(75, 175, 30, Gender.MALE);
      // BMR (men) = (10 × 75) + (6.25 × 175) - (5 × 30) + 5
      // = 750 + 1093.75 - 150 + 5 = 1698.75
      expect(bmr).toBeCloseTo(1698.75, 2);
    });

    it('should calculate BMR correctly for females', () => {
      const bmr = calculateBMR(65, 165, 28, Gender.FEMALE);
      // BMR (women) = (10 × 65) + (6.25 × 165) - (5 × 28) - 161
      // = 650 + 1031.25 - 140 - 161 = 1380.25
      expect(bmr).toBeCloseTo(1380.25, 2);
    });

    it('should handle different ages correctly', () => {
      const bmr20 = calculateBMR(70, 170, 20, Gender.MALE);
      const bmr40 = calculateBMR(70, 170, 40, Gender.MALE);

      // Older age should result in lower BMR
      expect(bmr20).toBeGreaterThan(bmr40);
      expect(bmr20 - bmr40).toBe(100); // 20 years difference × 5
    });

    it('should handle edge cases', () => {
      // Very light person
      const bmrLight = calculateBMR(45, 150, 25, Gender.FEMALE);
      expect(bmrLight).toBeGreaterThan(0);

      // Very heavy person
      const bmrHeavy = calculateBMR(120, 190, 35, Gender.MALE);
      expect(bmrHeavy).toBeGreaterThan(bmrLight);
    });
  });

  describe('getActivityMultiplier', () => {
    it('should return correct multipliers for each activity level', () => {
      expect(getActivityMultiplier(ActivityLevel.SEDENTARY)).toBe(1.2);
      expect(getActivityMultiplier(ActivityLevel.LIGHT)).toBe(1.375);
      expect(getActivityMultiplier(ActivityLevel.MODERATE)).toBe(1.55);
      expect(getActivityMultiplier(ActivityLevel.ACTIVE)).toBe(1.725);
      expect(getActivityMultiplier(ActivityLevel.VERY_ACTIVE)).toBe(1.9);
    });
  });

  describe('calculateTDEE', () => {
    it('should calculate TDEE correctly', () => {
      const bmr = 1700;
      const tdee = calculateTDEE(bmr, ActivityLevel.MODERATE);

      // TDEE = BMR × 1.55 = 1700 × 1.55 = 2635
      expect(tdee).toBe(2635);
    });

    it('should scale with activity level', () => {
      const bmr = 1500;
      const sedentaryTDEE = calculateTDEE(bmr, ActivityLevel.SEDENTARY);
      const activeTDEE = calculateTDEE(bmr, ActivityLevel.VERY_ACTIVE);

      expect(activeTDEE).toBeGreaterThan(sedentaryTDEE);
      expect(sedentaryTDEE).toBe(1800); // 1500 × 1.2
      expect(activeTDEE).toBe(2850); // 1500 × 1.9
    });
  });

  describe('adjustForGoal', () => {
    const tdee = 2500;

    it('should subtract 500 for weight loss', () => {
      const adjusted = adjustForGoal(tdee, FitnessGoal.WEIGHT_LOSS);
      expect(adjusted).toBe(2000);
    });

    it('should not change for maintenance', () => {
      const adjusted = adjustForGoal(tdee, FitnessGoal.MAINTENANCE);
      expect(adjusted).toBe(2500);
    });

    it('should add 400 for bulking', () => {
      const adjusted = adjustForGoal(tdee, FitnessGoal.BULKING);
      expect(adjusted).toBe(2900);
    });

    it('should add 250 for muscle gain', () => {
      const adjusted = adjustForGoal(tdee, FitnessGoal.MUSCLE_GAIN);
      expect(adjusted).toBe(2750);
    });
  });

  describe('calculateMacros', () => {
    it('should calculate macros correctly for weight loss', () => {
      const calories = 2000;
      const macros = calculateMacros(calories, FitnessGoal.WEIGHT_LOSS);

      // Protein: 35% of 2000 = 700 cal / 4 = 175g
      // Carbs: 30% of 2000 = 600 cal / 4 = 150g
      // Fat: 35% of 2000 = 700 cal / 9 = 78g (rounded)
      expect(macros.daily_protein_target).toBe(175);
      expect(macros.daily_carbs_target).toBe(150);
      expect(macros.daily_fat_target).toBe(78);
    });

    it('should calculate macros correctly for bulking', () => {
      const calories = 3000;
      const macros = calculateMacros(calories, FitnessGoal.BULKING);

      // Protein: 30% of 3000 = 900 cal / 4 = 225g
      // Carbs: 45% of 3000 = 1350 cal / 4 = 338g (rounded)
      // Fat: 25% of 3000 = 750 cal / 9 = 83g
      expect(macros.daily_protein_target).toBe(225);
      expect(macros.daily_carbs_target).toBe(338);
      expect(macros.daily_fat_target).toBe(83);
    });

    it('should calculate macros correctly for maintenance', () => {
      const calories = 2500;
      const macros = calculateMacros(calories, FitnessGoal.MAINTENANCE);

      // Protein: 30% of 2500 = 750 cal / 4 = 188g (rounded)
      // Carbs: 40% of 2500 = 1000 cal / 4 = 250g
      // Fat: 30% of 2500 = 750 cal / 9 = 83g
      expect(macros.daily_protein_target).toBe(188);
      expect(macros.daily_carbs_target).toBe(250);
      expect(macros.daily_fat_target).toBe(83);
    });

    it('should return whole numbers', () => {
      const macros = calculateMacros(2337, FitnessGoal.WEIGHT_LOSS);

      expect(Number.isInteger(macros.daily_protein_target)).toBe(true);
      expect(Number.isInteger(macros.daily_carbs_target)).toBe(true);
      expect(Number.isInteger(macros.daily_fat_target)).toBe(true);
    });
  });

  describe('calculateNutritionTargets', () => {
    it('should calculate complete nutrition targets for a male', () => {
      const profile = {
        height: 180,
        weight: 80,
        age: 30,
        gender: Gender.MALE,
        activity_level: ActivityLevel.MODERATE,
        goal: FitnessGoal.MAINTENANCE
      };

      const targets = calculateNutritionTargets(profile);

      expect(targets.daily_calorie_target).toBeGreaterThan(0);
      expect(targets.daily_protein_target).toBeGreaterThan(0);
      expect(targets.daily_carbs_target).toBeGreaterThan(0);
      expect(targets.daily_fat_target).toBeGreaterThan(0);

      // All should be whole numbers
      expect(Number.isInteger(targets.daily_calorie_target)).toBe(true);
      expect(Number.isInteger(targets.daily_protein_target)).toBe(true);
      expect(Number.isInteger(targets.daily_carbs_target)).toBe(true);
      expect(Number.isInteger(targets.daily_fat_target)).toBe(true);
    });

    it('should calculate complete nutrition targets for a female', () => {
      const profile = {
        height: 165,
        weight: 60,
        age: 28,
        gender: Gender.FEMALE,
        activity_level: ActivityLevel.LIGHT,
        goal: FitnessGoal.WEIGHT_LOSS
      };

      const targets = calculateNutritionTargets(profile);

      expect(targets.daily_calorie_target).toBeGreaterThan(0);
      expect(targets.daily_protein_target).toBeGreaterThan(0);
      expect(targets.daily_carbs_target).toBeGreaterThan(0);
      expect(targets.daily_fat_target).toBeGreaterThan(0);
    });

    it('should produce higher calories for bulking vs weight loss', () => {
      const baseProfile = {
        height: 175,
        weight: 75,
        age: 30,
        gender: Gender.MALE,
        activity_level: ActivityLevel.MODERATE
      };

      const weightLossTargets = calculateNutritionTargets({
        ...baseProfile,
        goal: FitnessGoal.WEIGHT_LOSS
      });

      const bulkingTargets = calculateNutritionTargets({
        ...baseProfile,
        goal: FitnessGoal.BULKING
      });

      expect(bulkingTargets.daily_calorie_target).toBeGreaterThan(
        weightLossTargets.daily_calorie_target
      );
    });
  });

  describe('getMealCalorieRange', () => {
    it('should calculate breakfast range correctly', () => {
      const range = getMealCalorieRange(2000, 'breakfast');

      // Breakfast: 25% of 2000 = 500 cal
      // Min: 500 × 0.8 = 400
      // Max: 500 × 1.2 = 600
      expect(range.min).toBe(400);
      expect(range.max).toBe(600);
    });

    it('should calculate lunch range correctly', () => {
      const range = getMealCalorieRange(2000, 'lunch');

      // Lunch: 35% of 2000 = 700 cal
      // Min: 700 × 0.8 = 560
      // Max: 700 × 1.2 = 840
      expect(range.min).toBe(560);
      expect(range.max).toBe(840);
    });

    it('should calculate dinner range correctly', () => {
      const range = getMealCalorieRange(2000, 'dinner');

      // Dinner: 30% of 2000 = 600 cal
      expect(range.min).toBe(480);
      expect(range.max).toBe(720);
    });

    it('should calculate snacks range correctly', () => {
      const range = getMealCalorieRange(2000, 'snacks');

      // Snacks: 10% of 2000 = 200 cal
      expect(range.min).toBe(160);
      expect(range.max).toBe(240);
    });

    it('should be case-insensitive', () => {
      const lower = getMealCalorieRange(2000, 'lunch');
      const upper = getMealCalorieRange(2000, 'LUNCH');
      const mixed = getMealCalorieRange(2000, 'LuNcH');

      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });

    it('should default to breakfast percentage for unknown meal types', () => {
      const range = getMealCalorieRange(2000, 'unknown');
      const breakfastRange = getMealCalorieRange(2000, 'breakfast');

      expect(range).toEqual(breakfastRange);
    });
  });

  describe('classifyMeal', () => {
    const dailyCalories = 2000;

    describe('breakfast classification', () => {
      it('should classify meal as RECOMMENDED when within range', () => {
        const classification = classifyMeal(500, dailyCalories, 'breakfast');
        expect(classification).toBe('RECOMMENDED');
      });

      it('should classify meal as CLOSE_MATCH when slightly over', () => {
        const classification = classifyMeal(650, dailyCalories, 'breakfast');
        expect(classification).toBe('CLOSE_MATCH');
      });

      it('should classify meal as NOT_RECOMMENDED when too high', () => {
        const classification = classifyMeal(800, dailyCalories, 'breakfast');
        expect(classification).toBe('NOT_RECOMMENDED');
      });
    });

    describe('lunch classification', () => {
      it('should classify meal as RECOMMENDED when within range', () => {
        const classification = classifyMeal(700, dailyCalories, 'lunch');
        expect(classification).toBe('RECOMMENDED');
      });

      it('should classify meal as CLOSE_MATCH when slightly over', () => {
        const classification = classifyMeal(900, dailyCalories, 'lunch');
        expect(classification).toBe('CLOSE_MATCH');
      });

      it('should classify meal as NOT_RECOMMENDED when too high', () => {
        const classification = classifyMeal(1200, dailyCalories, 'lunch');
        expect(classification).toBe('NOT_RECOMMENDED');
      });
    });

    describe('edge cases', () => {
      it('should handle very low calorie meals', () => {
        const classification = classifyMeal(50, dailyCalories, 'snacks');
        expect(classification).toBe('RECOMMENDED');
      });

      it('should handle maximum recommended calories', () => {
        // Lunch max is 840 (35% × 2000 × 1.2)
        const classification = classifyMeal(840, dailyCalories, 'lunch');
        expect(classification).toBe('RECOMMENDED');
      });

      it('should handle exactly at CLOSE_MATCH boundary', () => {
        // Lunch max × 1.25 = 840 × 1.25 = 1050
        const classification = classifyMeal(1050, dailyCalories, 'lunch');
        expect(classification).toBe('CLOSE_MATCH');
      });
    });

    describe('different daily calorie targets', () => {
      it('should adjust classifications based on daily target', () => {
        const lowCalorieDiet = 1500;
        const highCalorieDiet = 3000;

        const lowClassification = classifyMeal(600, lowCalorieDiet, 'lunch');
        const highClassification = classifyMeal(600, highCalorieDiet, 'lunch');

        // For 1500 cal diet: lunch max = 1500 * 0.35 * 1.2 = 630
        // 600 is within range, so RECOMMENDED
        // For 3000 cal diet: lunch max = 3000 * 0.35 * 1.2 = 1260
        // 600 is definitely within range, so RECOMMENDED
        expect(lowClassification).toBe('RECOMMENDED');
        expect(highClassification).toBe('RECOMMENDED');
      });
    });
  });
});
