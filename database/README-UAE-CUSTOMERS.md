# UAE Customer Seed Data Summary

## Overview
Added realistic customer data with Arabic and Indian names for demo purposes to showcase the cuts.ae platform to sponsors.

## Database Seed File
- **Location**: `/Users/sour/Projects/cuts.ae/api/database/seed-uae-customers.sql`
- **Run after**: `schema.sql` and `seed.sql`

## What Was Added

### Customers (44 Total)

#### Arabic UAE Customers (22)
1. Ahmed Al-Mansoori - ahmed.almansoori@cuts.ae - +971501234101
2. Fatima Al-Zaabi - fatima.alzaabi@cuts.ae - +971501234102
3. Mohammed Al-Shamsi - mohammed.alshamsi@cuts.ae - +971501234103
4. Noura Al-Mazrouei - noura.almazrouei@cuts.ae - +971501234104
5. Khalid Al-Suwaidi - khalid.alsuwaidi@cuts.ae - +971501234105
6. Mariam Al-Kaabi - mariam.alkaabi@cuts.ae - +971501234106
7. Sultan Al-Dhaheri - sultan.aldhaheri@cuts.ae - +971501234107
8. Hessa Al-Ketbi - hessa.alketbi@cuts.ae - +971501234108
9. Rashid Al-Nuaimi - rashid.alnuaimi@cuts.ae - +971501234109
10. Aisha Al-Mheiri - aisha.almheiri@cuts.ae - +971501234110
11. Saeed Al-Falasi - saeed.alfalasi@cuts.ae - +971501234111
12. Latifa Al-Dhaheri - latifa.aldhaheri@cuts.ae - +971501234112
13. Hamdan Al-Qubaisi - hamdan.alqubaisi@cuts.ae - +971501234113
14. Sheikha Al-Blooshi - sheikha.alblooshi@cuts.ae - +971501234114
15. Majid Al-Hammadi - majid.alhammadi@cuts.ae - +971501234115
16. Moza Al-Ahbabi - moza.alahbabi@cuts.ae - +971501234116
17. Abdullah Al-Marri - abdullah.almarri@cuts.ae - +971501234117
18. Amna Al-Kalbani - amna.alkalbani@cuts.ae - +971501234118
19. Omar Al-Naqbi - omar.alnaqbi@cuts.ae - +971501234119
20. Maha Al-Sharqi - maha.alsharqi@cuts.ae - +971501234120
21. Nasser Al-Shehhi - nasser.alshehhi@cuts.ae - +971501234121
22. Salama Al-Hosani - salama.alhosani@cuts.ae - +971501234122

#### Indian Customers (22)
1. Raj Kumar - raj.kumar@cuts.ae - +971501234201
2. Priya Sharma - priya.sharma@cuts.ae - +971501234202
3. Arun Patel - arun.patel@cuts.ae - +971501234203
4. Deepa Singh - deepa.singh@cuts.ae - +971501234204
5. Sanjay Gupta - sanjay.gupta@cuts.ae - +971501234205
6. Kavita Mehta - kavita.mehta@cuts.ae - +971501234206
7. Vikram Reddy - vikram.reddy@cuts.ae - +971501234207
8. Anjali Nair - anjali.nair@cuts.ae - +971501234208
9. Rahul Verma - rahul.verma@cuts.ae - +971501234209
10. Neha Iyer - neha.iyer@cuts.ae - +971501234210
11. Amit Shah - amit.shah@cuts.ae - +971501234211
12. Pooja Desai - pooja.desai@cuts.ae - +971501234212
13. Arjun Krishnan - arjun.krishnan@cuts.ae - +971501234213
14. Divya Rao - divya.rao@cuts.ae - +971501234214
15. Karan Joshi - karan.joshi@cuts.ae - +971501234215
16. Meera Pillai - meera.pillai@cuts.ae - +971501234216
17. Rohit Malhotra - rohit.malhotra@cuts.ae - +971501234217
18. Sneha Bhatt - sneha.bhatt@cuts.ae - +971501234218
19. Varun Chopra - varun.chopra@cuts.ae - +971501234219
20. Shreya Kapoor - shreya.kapoor@cuts.ae - +971501234220
21. Manish Bhatia - manish.bhatia@cuts.ae - +971501234221
22. Ritu Menon - ritu.menon@cuts.ae - +971501234222

### Customer Profiles (20)
20 customers have complete fitness profiles with:
- Height, weight, age, gender
- Activity levels (sedentary, light, moderate, active, very_active)
- Fitness goals (weight_loss, maintenance, bulking, muscle_gain)
- Daily macro targets (calories, protein, carbs, fat)
- Dietary restrictions where applicable

### Orders (20)

All orders include realistic:
- Order numbers (ORD-YYYYMMDD-AEXXXX format)
- Delivery addresses in Dubai and Abu Dhabi neighborhoods
- Various order statuses: delivered, in_transit, preparing, confirmed
- Time range: Last 7 days
- All restaurants represented

#### Order Distribution by Restaurant:
- **Healthy Bites Abu Dhabi** (@healthy-bites-abu-dhabi): 5 orders
- **Protein Palace** (@protein-palace): 5 orders
- **ABS Protein Kitchen** (@absaprotein): 5 orders
- **Clean Eats Dubai** (@cleaneats): 3 orders
- **Macro Meals UAE** (@macromealsuae): 5 orders (includes weekly meal preps)

#### Notable Dubai/Abu Dhabi Locations Used:
- Dubai: Marina, Downtown, Business Bay, JBR, Palm Jumeirah, City Walk, Arabian Ranches, Motor City
- Abu Dhabi: Al Reem Island, Saadiyat Island, Yas Island, Al Khalidiya, Corniche, Al Maryah Island, Al Reef

## Login Credentials

All demo accounts use the password: **password123**

### Sample Accounts:
- ahmed.almansoori@cuts.ae (Arabic UAE customer)
- fatima.alzaabi@cuts.ae (Arabic UAE customer)
- raj.kumar@cuts.ae (Indian customer)
- priya.sharma@cuts.ae (Indian customer)

## How to Use

Run the seed file in your Supabase SQL Editor or via psql:

```bash
psql -h your-supabase-host -d postgres -f seed-uae-customers.sql
```

Or copy and paste the contents into Supabase SQL Editor.

## Professional Features for Sponsor Demo

1. **Authentic UAE Names**: Uses real Emirati family names (Al-Mansoori, Al-Zaabi, etc.) and common Indian names
2. **Realistic Addresses**: Actual Dubai and Abu Dhabi neighborhoods with building names
3. **UAE Phone Format**: All numbers use +971 country code
4. **Professional Emails**: All use @cuts.ae domain
5. **Diverse Orders**: Mix of single meals, meal preps, different restaurants, and order statuses
6. **Complete Profiles**: Many customers have fitness goals and macro targets
7. **Recent Activity**: Orders from the last 7 days showing active platform usage

## Order Value Summary

- Total order value: AED 4,293.45
- Average order value: AED 214.67
- Delivery fees range: AED 10-15
- Includes both individual meals and weekly meal prep packages (AED 295-325)

This data creates a realistic, professional demo environment showcasing the platform's appeal to the UAE market with both local Emirati and expatriate Indian customers.
