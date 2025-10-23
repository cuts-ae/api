import {
  calculateBMR,
  calculateTDEE,
  adjustForGoal,
  calculateMacros,
  calculateNutritionTargets,
  getMealCalorieRange,
  classifyMeal,
  getActivityMultiplier
} from '../../utils/nutrition';
import { Gender, ActivityLevel, FitnessGoal } from '../../types';

describe('Nutrition Utility Functions', () => {
  describe('calculateBMR', () => {
    it('should calculate BMR correctly for men', () => {
      const bmr = calculateBMR(80, 175, 28, Gender.MALE);
      // BMR (men) = (10 × 80) + (6.25 × 175) - (5 × 28) + 5
      // = 800 + 1093.75 - 140 + 5 = 1758.75
      expect(bmr).toBeCloseTo(1758.75, 1);
    });

    it('should calculate BMR correctly for women', () => {
      const bmr = calculateBMR(65, 165, 25, Gender.FEMALE);
      // BMR (women) = (10 × 65) + (6.25 × 165) - (5 × 25) - 161
      // = 650 + 1031.25 - 125 - 161 = 1395.25
      expect(bmr).toBeCloseTo(1395.25, 1);
    });

    it('should handle different weight/height/age combinations', () => {
      const bmr1 = calculateBMR(70, 170, 30, Gender.MALE);
      const bmr2 = calculateBMR(90, 180, 25, Gender.MALE);
      expect(bmr2).toBeGreaterThan(bmr1);
    });
  });

  describe('getActivityMultiplier', () => {
    it('should return correct multiplier for sedentary', () => {
      expect(getActivityMultiplier(ActivityLevel.SEDENTARY)).toBe(1.2);
    });

    it('should return correct multiplier for light activity', () => {
      expect(getActivityMultiplier(ActivityLevel.LIGHT)).toBe(1.375);
    });

    it('should return correct multiplier for moderate activity', () => {
      expect(getActivityMultiplier(ActivityLevel.MODERATE)).toBe(1.55);
    });

    it('should return correct multiplier for active', () => {
      expect(getActivityMultiplier(ActivityLevel.ACTIVE)).toBe(1.725);
    });

    it('should return correct multiplier for very active', () => {
      expect(getActivityMultiplier(ActivityLevel.VERY_ACTIVE)).toBe(1.9);
    });
  });

  describe('calculateTDEE', () => {
    it('should calculate TDEE correctly for sedentary lifestyle', () => {
      const bmr = 1750;
      const tdee = calculateTDEE(bmr, ActivityLevel.SEDENTARY);
      expect(tdee).toBe(Math.round(1750 * 1.2)); // 2100
    });

    it('should calculate TDEE correctly for active lifestyle', () => {
      const bmr = 1750;
      const tdee = calculateTDEE(bmr, ActivityLevel.ACTIVE);
      expect(tdee).toBe(Math.round(1750 * 1.725)); // 3019
    });

    it('should return higher TDEE for more active lifestyles', () => {
      const bmr = 1750;
      const sedentary = calculateTDEE(bmr, ActivityLevel.SEDENTARY);
      const active = calculateTDEE(bmr, ActivityLevel.VERY_ACTIVE);
      expect(active).toBeGreaterThan(sedentary);
    });
  });

  describe('adjustForGoal', () => {
    const tdee = 2500;

    it('should subtract 500 calories for weight loss', () => {
      const adjusted = adjustForGoal(tdee, FitnessGoal.WEIGHT_LOSS);
      expect(adjusted).toBe(2000);
    });

    it('should maintain TDEE for maintenance goal', () => {
      const adjusted = adjustForGoal(tdee, FitnessGoal.MAINTENANCE);
      expect(adjusted).toBe(2500);
    });

    it('should add 400 calories for bulking', () => {
      const adjusted = adjustForGoal(tdee, FitnessGoal.BULKING);
      expect(adjusted).toBe(2900);
    });

    it('should add 250 calories for muscle gain', () => {
      const adjusted = adjustForGoal(tdee, FitnessGoal.MUSCLE_GAIN);
      expect(adjusted).toBe(2750);
    });
  });

  describe('calculateMacros', () => {
    it('should calculate macros correctly for weight loss', () => {
      const macros = calculateMacros(2000, FitnessGoal.WEIGHT_LOSS);

      // Weight loss: 35% protein, 30% carbs, 35% fat
      // Protein: 2000 * 0.35 / 4 = 175g
      // Carbs: 2000 * 0.30 / 4 = 150g
      // Fat: 2000 * 0.35 / 9 = 77.7g ≈ 78g

      expect(macros.daily_protein_target).toBe(175);
      expect(macros.daily_carbs_target).toBe(150);
      expect(macros.daily_fat_target).toBeCloseTo(78, 0);
    });

    it('should calculate macros correctly for muscle gain', () => {
      const macros = calculateMacros(2500, FitnessGoal.MUSCLE_GAIN);

      // Muscle gain: 30% protein, 45% carbs, 25% fat
      expect(macros.daily_protein_target).toBeGreaterThan(0);
      expect(macros.daily_carbs_target).toBeGreaterThan(0);
      expect(macros.daily_fat_target).toBeGreaterThan(0);
    });

    it('should have higher carbs for bulking goals', () => {
      const weightLoss = calculateMacros(2000, FitnessGoal.WEIGHT_LOSS);
      const bulking = calculateMacros(2000, FitnessGoal.BULKING);

      expect(bulking.daily_carbs_target).toBeGreaterThan(weightLoss.daily_carbs_target);
    });
  });

  describe('calculateNutritionTargets', () => {
    it('should calculate complete nutrition targets', () => {
      const profile = {
        weight: 80,
        height: 175,
        age: 28,
        gender: Gender.MALE,
        activity_level: ActivityLevel.MODERATE,
        goal: FitnessGoal.WEIGHT_LOSS
      };

      const targets = calculateNutritionTargets(profile);

      expect(targets.daily_calorie_target).toBeGreaterThan(0);
      expect(targets.daily_protein_target).toBeGreaterThan(0);
      expect(targets.daily_carbs_target).toBeGreaterThan(0);
      expect(targets.daily_fat_target).toBeGreaterThan(0);
    });

    it('should give lower calories for weight loss vs bulking', () => {
      const baseProfile = {
        weight: 80,
        height: 175,
        age: 28,
        gender: Gender.MALE,
        activity_level: ActivityLevel.MODERATE
      };

      const weightLoss = calculateNutritionTargets({
        ...baseProfile,
        goal: FitnessGoal.WEIGHT_LOSS
      });

      const bulking = calculateNutritionTargets({
        ...baseProfile,
        goal: FitnessGoal.BULKING
      });

      expect(bulking.daily_calorie_target).toBeGreaterThan(weightLoss.daily_calorie_target);
    });
  });

  describe('getMealCalorieRange', () => {
    const dailyCalories = 2000;

    it('should return correct range for breakfast (25%)', () => {
      const range = getMealCalorieRange(dailyCalories, 'breakfast');
      // 25% of 2000 = 500
      // Min: 500 * 0.8 = 400
      // Max: 500 * 1.2 = 600
      expect(range.min).toBe(400);
      expect(range.max).toBe(600);
    });

    it('should return correct range for lunch (35%)', () => {
      const range = getMealCalorieRange(dailyCalories, 'lunch');
      // 35% of 2000 = 700
      expect(range.min).toBe(560);
      expect(range.max).toBe(840);
    });

    it('should return correct range for dinner (30%)', () => {
      const range = getMealCalorieRange(dailyCalories, 'dinner');
      // 30% of 2000 = 600
      expect(range.min).toBe(480);
      expect(range.max).toBe(720);
    });

    it('should return correct range for snacks (10%)', () => {
      const range = getMealCalorieRange(dailyCalories, 'snacks');
      // 10% of 2000 = 200
      expect(range.min).toBe(160);
      expect(range.max).toBe(240);
    });
  });

  describe('classifyMeal', () => {
    const dailyCalories = 2000;

    it('should classify meal as RECOMMENDED if within range', () => {
      const classification = classifyMeal(550, dailyCalories, 'breakfast');
      expect(classification).toBe('RECOMMENDED');
    });

    it('should classify meal as CLOSE_MATCH if slightly over', () => {
      const classification = classifyMeal(700, dailyCalories, 'breakfast');
      // Max is 600, 700 is within 125% of max
      expect(classification).toBe('CLOSE_MATCH');
    });

    it('should classify meal as NOT_RECOMMENDED if too high', () => {
      const classification = classifyMeal(900, dailyCalories, 'breakfast');
      // Max is 600, 900 is way over 125% of max
      expect(classification).toBe('NOT_RECOMMENDED');
    });

    it('should handle different meal types correctly', () => {
      // Lunch has higher calorie range (35%)
      const lunch = classifyMeal(700, dailyCalories, 'lunch');
      expect(lunch).toBe('RECOMMENDED'); // Within 840 max

      // Breakfast has lower range (25%)
      const breakfast = classifyMeal(700, dailyCalories, 'breakfast');
      expect(breakfast).toBe('CLOSE_MATCH'); // Over 600 max but under 750
    });
  });
});
