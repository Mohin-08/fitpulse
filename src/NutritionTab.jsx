import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

// Helper function for date formatting (YYYY-MM-DD)
const getTodayDateString = () => new Date().toISOString().substring(0, 10);

// --- CONSTANTS AND CALCULATORS ---

// NEW: Calorie Range Constants (Used to clamp the TDEE calculation)
const CALORIE_RANGES = {
    'lean': { MIN: 2200, MAX: 2400 },
    'bulk': { MIN: 2900, MAX: 3400 },
    'recomposition': { MIN: 2600, MAX: 2900 },
    'maintain': { MIN: 2600, MAX: 2900 },
    'performance': { MIN: 2600, MAX: 2900 }
};

const calculateBMR = (gender, weight, height, age) => {
    // Harris-Benedict revised formula
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161);
    return bmr;
};
const ACTIVITY_MULTIPLIER = 1.55; 

// Bodyweight-based protein goals (g per kg of weight) and calorie adjustments
const GOAL_MACROS = {
    'lean': { protein_g_per_kg: 2.2, adjust_cals: -300, fat_ratio: 30, carbs_ratio: 70, description: "A deficit focused on very high protein to preserve muscle mass during aggressive fat loss." },
    'recomposition': { protein_g_per_kg: 1.8, adjust_cals: 0, fat_ratio: 25, carbs_ratio: 75, description: "Focus on maintaining calories while prioritizing high protein to optimize muscle gain and fat loss." },
    'bulk': { protein_g_per_kg: 2.0, adjust_cals: 300, fat_ratio: 25, carbs_ratio: 75, description: "A moderate surplus with high protein and carbs to support muscle and strength gain." },
    'maintain': { protein_g_per_kg: 1.6, adjust_cals: 0, fat_ratio: 30, carbs_ratio: 70, description: "Calorie equilibrium for long-term fitness and performance maintenance." },
    'performance': { protein_g_per_kg: 1.6, adjust_cals: 200, fat_ratio: 20, carbs_ratio: 80, description: "High carbohydrate focus to maximize energy stores for intense endurance workouts." }
};

const FOOD_SWAP_LIBRARY = {
    'Breakfast': [
        { name: 'Oatmeal with Milk', protein: 20, carbs: 10, fat: 5, base_unit: 'g (Dry Oats)', img: 'https://www.daisybeet.com/wp-content/uploads/2025/02/Creamy-high-protein-oatmeal-with-milk-9.png', prep: 'Cook 50g oats with 200ml milk/water. Top with berries/cinnamon.' },
        { name: 'Museli & Greek Yogurt', protein: 20, carbs: 25, fat: 8, base_unit: 'g (Yogurt/Muesli)', img: 'https://ifed.sphealth.com.au/image.ashx?guid=14367526-f526-456c-8d49-4ce0c339083d', prep: 'Mix 150g Greek yogurt with 50g muesli. Quick, high-protein breakfast.' },
        { name: 'Cottage Cheese Bowl', protein: 20, carbs: 7, fat: 5, base_unit: 'g (Cottage Cheese)', img: 'https://www.daisybeet.com/wp-content/uploads/2025/02/Creamy-high-protein-oatmeal-with-milk-9.png', prep: 'Serve 150g cottage cheese with half a sliced apple and dash of honey.' },
        { name: 'Protein Smoothie', protein: 30, carbs: 10, fat: 3, base_unit: 'g (Protein Powder)', img: 'https://dymatize.imgix.net/production/blog/ChocPeppermintProteinShake_1856x1236.jpg?ar=928%3A618&auto=format%2Ccompress&fit=crop&ixlib=php-3.1.0', prep: 'Blend 1 scoop protein powder, 1 banana, 1 cup spinach, and water/ice.' },
    ],
    'Protein': [
        { name: 'Chicken Breast', protein: 31, carbs: 0, fat: 4, base_unit: 'g (Cooked)', img: 'https://easychickenrecipes.com/wp-content/uploads/2022/10/Featured-Pan-Seared-Chicken-Breasts-1-of-1.jpg', prep: 'Pan-sear/bake 120-150g chicken breast until internal temp reaches 74°C.' },
        { name: 'Salmon Fillet', protein: 25, carbs: 0, fat: 13, base_unit: 'g (Cooked)', img: 'https://www.wholesomeyum.com/wp-content/uploads/2023/11/wholesomeyum-Pan-Seared-Salmon-27.jpg', prep: 'Bake 100-120g salmon at 200°C for 12 mins with lemon slices and dill.' },
        { name: 'Soya Chunks', protein: 52, carbs: 33, fat: 0, base_unit: 'g (Dry)', img: 'https://www.myplantifulcooking.com/wp-content/uploads/2021/09/soya-chunks-dry-masala-pan.jpg', prep: 'Soak, boil, and pan-fry 50g soya chunks with spices. High protein vegetarian option.' },
        { name: 'Paneer Cubes', protein: 18, carbs: 4, fat: 25, base_unit: 'g (Raw)', img: 'https://res.cloudinary.com/solin-fitness/image/upload/c_scale,w_500,q_auto,f_auto/single-meal-images/ebgtpljfsrgebpjtg0xd', prep: 'Lightly pan-fry 100g paneer cubes. Mix with cooked vegetables or spinach.' },
    ],
    'Carb': [
        { name: 'Brown Rice', protein: 3, carbs: 23, fat: 1, base_unit: 'g (Cooked)', img: 'https://www.themediterraneandish.com/wp-content/uploads/2024/01/How-to-Cook-Brown-Rice-16.jpg', prep: 'Boil 2 cups of water for 1 cup rice. Simmer for 40 mins. Approx 150g cooked per serving.' },
        { name: 'Sweet Potato', protein: 2, carbs: 20, fat: 0, base_unit: 'g (Cooked)', img: 'https://c.ndtvimg.com/gws/ms/health-benefits-of-sweet-potatoes/assets/5.png', prep: 'Bake at 200°C for 45 mins. Serve diced or mashed. Approx 150g per medium potato.' },
        { name: 'Whole Wheat Roti (2 pcs)', protein: 10, carbs: 25, fat: 4, base_unit: 'pcs', img: 'https://cdn.indiaphile.info/wp-content/uploads/2022/09/stp-roti-1142.jpg?width=1200&crop_gravity=center&aspect_ratio=2:3&q=75', prep: 'Cook 2 rotis on a tava. Eat with subzi/protein curry.' },
    ],
    'Fat': [
        { name: 'Avocado (1/2)', protein: 2, carbs: 9, fat: 15, base_unit: 'portion', img: 'https://images.immediate.co.uk/production/volatile/sites/30/2022/07/Avocado-sliced-in-half-ca9d808.jpg?quality=90&resize=440,400', prep: 'Slice half an avocado. Add salt/pepper/lime juice. Great with eggs or salad.' },
        { name: 'Salad', protein: 4, carbs: 15, fat: 3, base_unit: 'g', img: 'https://mallorythedietitian.com/wp-content/uploads/2025/03/cucumber-carrot-salad-in-a-glass-bowl-side-view-1.jpg', prep: 'Wash and cut carrot and cucumber. Whisk olive oil, lemon juice, salt, and pepper. Pour over vegetables and toss well' }
    ],
    'Snack': [
        { name: 'Rice Cakes w/ Peanut Butter', protein: 5, carbs: 25, fat: 10, base_unit: 'unit', img: 'https://www.bodybuildingmealplan.com/wp-content/uploads/Rice-Cake-With-Peanut-Butter-scaled.jpg', prep: 'Top 2 rice cakes with 1 tbsp (15g) peanut butter. Quick fuel.' },
        { name: 'Protein Bar', protein: 20, carbs: 20, fat: 10, base_unit: 'bar', img: 'https://images-cdn.ubuy.co.in/681bf0aaf71bb0524d0d25de-barebells-protein-bars-creamy-crisp-12.jpg', prep: 'Grab and go. Choose one with low added sugar.' },
        { name: 'Hard-Boiled Eggs (2)', protein: 12, carbs: 1, fat: 10, base_unit: 'eggs', img: 'https://www.bowlofdelicious.com/wp-content/uploads/2015/11/Easy-to-Peel-Hard-Boiled-Eggs-square.jpg', prep: 'Boil eggs for 8-10 mins. Cool and peel. Excellent portable protein.' },
    ]
};

const MEAL_TEMPLATE = [
    { name: 'Breakfast', primaryType: 'Breakfast', time: '8:00 AM' }, // FIX: Only one item defined here
    { name: 'Lunch', proteinType: 'Protein', carbType: 'Carb', fatType: 'Fat', time: '1:00 PM' },
    { name: 'Dinner', proteinType: 'Protein', carbType: 'Carb', fatType: 'Fat', time: '7:30 PM' },
    { name: 'Snack (Pre/Post)', primaryType: 'Snack', time: '4:00 PM' }, // Only one item defined here
];

const calculateMealMacros = (foods) => {
    let totalCals = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const key in foods) {
        // Use regex to strip any non-numeric characters from the quantity string for safety
        const quantityGrams = parseFloat(foods[key].quantity?.replace(/[^\d.]/g, '')) || 0;
        const densityFactor = quantityGrams / 100;
        
        totalProtein += foods[key].protein * densityFactor;
        totalCarbs += foods[key].carbs * densityFactor;
        totalFat += foods[key].fat * densityFactor;
    }
    
    totalCals = Math.round((totalProtein * 4) + (totalCarbs * 4) + (totalFat * 9));
    
    return { 
        protein: Math.round(totalProtein), 
        carbs: Math.round(totalCarbs), 
        fat: Math.round(totalFat), 
        calories: totalCals 
    };
};

const generate7DayPlan = (protein, carbs, fat) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const weekPlan = [];

    const pickNonRedundantFood = (foodTypeKey, usedFoods) => {
        const library = FOOD_SWAP_LIBRARY[foodTypeKey];
        if (!library || library.length === 0) return null; 
        const availableFoods = library.filter(f => !usedFoods.includes(f.name));
        if (availableFoods.length === 0) {
            return library[Math.floor(Math.random() * library.length)];
        }
        return availableFoods[Math.floor(Math.random() * availableFoods.length)];
    };

    let lastMealFoods = {};
    let lastDayFoods = new Set();
    const dailyTargetMacros = { protein, carbs, fat }; 
    const dailyTargetCals = (protein * 4) + (carbs * 4) + (fat * 9); // Recalculate target calories using final calculated macros

    for (let d = 0; d < 7; d++) {
        const meals = MEAL_TEMPLATE.map((meal, mealIndex) => {
            const mealFoods = {};
            const foodTypeKeys = Object.keys(meal).filter(key => key.endsWith('Type')).map(key => meal[key]);
            
            // Define accurate ratios that sum to 100% across the 4 meals
            const dailyMacroDistribution = {
                'Breakfast': 0.25, // 25%
                'Lunch': 0.30,    // 30%
                'Dinner': 0.35,    // 35%
                'Snack (Pre/Post)': 0.10 // 10%
            };
            const macroRatio = dailyMacroDistribution[meal.name];
            
            // CRITICAL: Determine the exact CALORIE target for this meal
            const mealTargetCals = dailyTargetCals * macroRatio;

            foodTypeKeys.forEach(foodTypeKey => {
                let food = pickNonRedundantFood(foodTypeKey, Array.from(lastDayFoods)); 
                if (!food) return; 

                if (lastMealFoods[foodTypeKey] && food.name === lastMealFoods[foodTypeKey].name) {
                    food = pickNonRedundantFood(foodTypeKey, [food.name]); 
                }

                // --- FIXED PORTION CALCULATION LOGIC ---
                
                let targetMacroGrams;
                let primaryMacroKey;
                
                // 1. Calculate the target grams for this macro type within this meal's ratio
                if (foodTypeKey === 'Protein') {
                    targetMacroGrams = dailyTargetMacros.protein * macroRatio;
                    primaryMacroKey = 'protein';
                } else if (foodTypeKey === 'Carb') {
                    targetMacroGrams = dailyTargetMacros.carbs * macroRatio;
                    primaryMacroKey = 'carbs';
                } else if (foodTypeKey === 'Fat') { 
                    targetMacroGrams = dailyTargetMacros.fat * macroRatio;
                    primaryMacroKey = 'fat';
                } else { // Combined meals (Breakfast/Snack)
                    // For combined meals, we target the total meal Cals, then split the portion calculation
                    
                    const foodDensityCals = (food.protein * 4) + (food.carbs * 4) + (food.fat * 9);
                    
                    // The required quantity in grams to meet the MEAL's TOTAL CALORIES
                    const quantityGrams = Math.round((mealTargetCals / foodDensityCals) * 100); 
                    
                    // Skip the targetMacroGrams calculation for now, and use the quantity directly
                    targetMacroGrams = null; 
                    
                    // Use a placeholder primary key to avoid division by zero
                    primaryMacroKey = 'protein'; 
                    
                    // Use the calculated grams directly below.
                    const finalQuantityGrams = Math.min(quantityGrams, 350); 
                    
                    mealFoods[foodTypeKey] = { 
                        ...food, 
                        quantity: `${finalQuantityGrams}g`, 
                        base_macro_g: Math.round(food[primaryMacroKey] * (finalQuantityGrams / 100))
                    };
                    lastMealFoods[foodTypeKey] = food; 
                    return; // Skip standard portion calculation below
                }
                
                targetMacroGrams = Math.round(Math.max(5, targetMacroGrams || 0)); // Minimum 5g
                
                const baseMacroDensity = food[primaryMacroKey] || 1; 
                
                // Calculate quantity needed to hit the target MACRO GRAMS
                const quantityGrams = Math.round(targetMacroGrams * 100 / baseMacroDensity);
                
                const finalQuantityGrams = Math.min(quantityGrams, 350); // Cap portion size
                
                mealFoods[foodTypeKey] = { 
                    ...food, 
                    quantity: `${finalQuantityGrams}g`, 
                    base_macro_g: targetMacroGrams
                };
                lastMealFoods[foodTypeKey] = food; 
            });

            const macros = calculateMealMacros(mealFoods);
            return { name: meal.name, time: meal.time, macros, foods: mealFoods };
        });

        const foodsUsedInDay = new Set();
        meals.forEach(meal => {
            Object.values(meal.foods).forEach(food => foodsUsedInDay.add(food.name));
        });
        lastDayFoods = foodsUsedInDay; 

        weekPlan.push({ day: days[d], meals });
    }

    return weekPlan;
};

const useNutritionPlanner = (profile) => {
    const [targets, setTargets] = useState(null);
    const [weekPlan, setWeekPlan] = useState(null);
    const [completedMeals, setCompletedMeals] = useState({});
    const [isSavingLog, setIsSavingLog] = useState(false); 

    useEffect(() => {
        // Fetch completion status here (placeholder)
    }, [profile?.id]);

    useEffect(() => {
        try {
            const age = Number(profile?.age);
            const height = Number(profile?.height);
            const weight = Number(profile?.weight);
            
            if (!profile || !profile.goal || isNaN(age) || isNaN(height) || isNaN(weight) || age <= 0 || height <= 0 || weight <= 0) {
                setTargets(null);
                setWeekPlan(null);
                return;
            }

            const goal = profile.goal?.toLowerCase() || 'recomposition';
            const ratio = GOAL_MACROS[goal] || GOAL_MACROS['recomposition'];
            const gender = profile.gender?.toLowerCase() === 'female' ? 'female' : 'male'; 

            const bmr = calculateBMR(gender, weight, height, age);
            const tdee = bmr * ACTIVITY_MULTIPLIER;
            
            // --- NEW CALORIE MATH IMPLEMENTATION ---
            
            const goalRange = CALORIE_RANGES[goal] || CALORIE_RANGES['recomposition'];
            
            // 1. Calculate a dynamic TDEE-based calorie target
            let dynamicTarget = Math.round(tdee + ratio.adjust_cals);
            
            // 2. Clamp the target within the strict MIN/MAX range
            const targetCalories = Math.max(goalRange.MIN, Math.min(goalRange.MAX, dynamicTarget));
            
            // 3. Calculate Protein based on weight (g/kg) - remains priority
            const proteinGrams = Math.round(weight * ratio.protein_g_per_kg);
            const proteinCals = proteinGrams * 4;

            // 4. Calculate remaining calories for Fat and Carbs from the CLAMPED target
            const remainingCals = Math.max(0, targetCalories - proteinCals); 
            
            // 5. Calculate Fat and Carbs based on remaining ratio
            const totalRemainingRatio = ratio.fat_ratio + ratio.carbs_ratio;
            
            const fatGrams = Math.round((remainingCals * (ratio.fat_ratio / totalRemainingRatio)) / 9);
            const carbGrams = Math.round((remainingCals * (ratio.carbs_ratio / totalRemainingRatio)) / 4);
            
            // Final Cals Check (to display the final total in the card, using calculated macros)
            const finalCals = (proteinGrams * 4) + (fatGrams * 9) + (carbGrams * 4);
            // --- END NEW CALORIE MATH IMPLEMENTATION ---

            setTargets({
                targetCalories: finalCals, // This is the final calculated target
                proteinGrams,
                fatGrams,
                carbGrams,
                description: ratio.description,
                goal
            });

            // Generate plan using the realistic macro targets
            setWeekPlan(generate7DayPlan(proteinGrams, carbGrams, fatGrams));

        } catch (e) {
             console.error("Nutrition Calculation Crashed:", e);
             setTargets(null);
             setWeekPlan(null);
        }
    }, [profile, profile?.age, profile?.height, profile?.weight, profile?.goal, profile?.gender]); 

    // [All other helper functions remain the same]
    const saveCompletionToDB = async (dayIndex, mealIndex, isCompleted) => {
        if (!profile?.id || !weekPlan || weekPlan.length === 0) return; 
        
        const mealName = MEAL_TEMPLATE[mealIndex].name;
        const dayName = weekPlan[dayIndex].day;
        const mealKey = `${dayName}-${mealName}`; 
        const today = new Date().toISOString().substring(0, 10);
        
        const { error } = await supabase.from('progress').upsert({
            user_id: profile.id,
            date: today, 
            meal_key: mealKey, 
            complete: isCompleted, // CORRECTED TO MATCH DB SCHEMA
            weight: null, 
            notes: null
        }, { onConflict: ['user_id', 'date', 'meal_key'] });

        if (error) {
            console.error('Error saving meal completion to progress table:', error);
        }
    };
    
    const handleSwap = (dayIndex, mealIndex, foodTypeKey) => {
        setWeekPlan(prevWeekPlan => {
            const newWeekPlan = [...prevWeekPlan];
            const currentItem = newWeekPlan[dayIndex].meals[mealIndex].foods[foodTypeKey];
            const swapPool = FOOD_SWAP_LIBRARY[foodTypeKey];
            
            const currentFoodName = currentItem.name;
            const availableSwaps = swapPool.filter(f => f.name !== currentFoodName);

            if (availableSwaps.length === 0) return prevWeekPlan; 
            
            const randomIndex = Math.floor(Math.random() * availableSwaps.length);
            const newFood = availableSwaps[randomIndex];
            
            const requiredMacroBase = newWeekPlan[dayIndex].meals[mealIndex].foods[foodTypeKey].base_macro_g;
            const newServingBaseMacroDensity = newFood.protein || newFood.carbs || newFood.fat;
            
            const quantityGrams = Math.round(requiredMacroBase * 100 / Math.max(1, newServingBaseMacroDensity)); 
            const finalQuantityGrams = Math.min(quantityGrams, 350); 
            
            newWeekPlan[dayIndex].meals[mealIndex].foods[foodTypeKey] = {
                ...newFood,
                quantity: `${finalQuantityGrams}g`, 
                base_macro_g: requiredMacroBase
            };
            
            newWeekPlan[dayIndex].meals[mealIndex].macros = calculateMealMacros(newWeekPlan[dayIndex].meals[mealIndex].foods);

            return newWeekPlan;
        });
    };
    
    const toggleMealCompletion = (dayIndex, mealIndex) => {
        const key = `${dayIndex}-${mealIndex}`;
        const newStatus = !completedMeals[key];
        
        setCompletedMeals(prev => ({
            ...prev,
            [key]: newStatus 
        }));
        
        saveCompletionToDB(dayIndex, mealIndex, newStatus); 
    };

    // Targets nutrition_logs table now (as previously fixed)
    const logDailyTotals = async (currentDayIndex) => {
        if (!weekPlan || weekPlan.length === 0 || isSavingLog) return; 
        
        setIsSavingLog(true);
        const { user } = (await supabase.auth.getUser()).data;
        if (!user) {
            setIsSavingLog(false);
            console.error('User not logged in.');
            return;
        }

        const currentDay = weekPlan[currentDayIndex];
        const today = new Date().toISOString().substring(0, 10);
        
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalCalories = 0;
        
        currentDay.meals.forEach(meal => {
            totalProtein += meal.macros.protein;
            totalCarbs += meal.macros.carbs;
            totalFat += meal.macros.fat;
            totalCalories += meal.macros.calories;
        });

        // IMPORTANT FIX: Targeting 'nutrition_logs'
        const { error } = await supabase.from('nutrition_logs').insert([
            {
                user_id: user.id,
                date: today,
                meal_key: 'DAILY_SUMMARY', 
                meal_time: 'End of Day',
                calories_consumed: totalCalories,
                macro_protein_g: totalProtein, 
                macro_carbs_g: totalCarbs,
                macro_fat_g: totalFat,
                calories_total: totalCalories,
                consumed_foods: { summary: `Generated from ${currentDay.day} plan.` },
            }
        ]);
        
        setIsSavingLog(false);
        
        if (error) {
            console.error('Error logging daily nutrition:', error);
            alert(`Error logging daily nutrition: ${error.message}`);
        } else {
            console.log('Daily Nutrition Logged Successfully!');
            alert('Daily Nutrition Logged Successfully!');
        }
    };

    return { targets, weekPlan, handleSwap, GOAL_MACROS, completedMeals, toggleMealCompletion, logDailyTotals, isSavingLog };
};


export default function NutritionTab({ profile }) {
    // 1. ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
    const { targets, weekPlan, handleSwap, GOAL_MACROS, completedMeals, toggleMealCompletion, logDailyTotals, isSavingLog } = useNutritionPlanner(profile);
    const [loading, setLoading] = useState(false); 
    const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
    const [selectedFoodDetails, setSelectedFoodDetails] = useState(null);
    const [currentDayIndex, setCurrentDayIndex] = useState(0); 

    const showFoodDetails = (food) => {
        setSelectedFoodDetails(food);
        setIsFoodModalOpen(true);
    };

    // 2. NOW APPLY CONDITIONAL RENDERING
    if (loading) return <div className="fitpulse-card">Loading Nutrition Plan...</div>;

    if (!targets || !weekPlan || !weekPlan.length) {
        return (
            <div className="fitpulse-card" style={{ textAlign: 'center' }}>
                <h2 className="fitpulse-title-section">Nutrition Plan Setup</h2>
                <p style={{ color: '#a0b2c5', fontSize: '1.2rem', marginTop: '20px' }}>
                    Please ensure your **Profile Tab** has all required details (Age, Height, Weight, Goal) saved to generate your plan.
                </p>
            </div>
        );
    }
    
    const currentGoalName = targets.goal?.toUpperCase() || 'RECOMMENDED';

    return (
        <div className="nutrition-tab-container">
            <h2 className="fitpulse-title-section" style={{ marginBottom: '30px' }}>
                Your Personalized Nutrition Plan
            </h2>

            {/* --- MACRO TARGETS CARD --- */}
            <div className="macro-target-card">
                <h3 style={{ color: '#c7d2e4', fontSize: '1.5rem', marginBottom: '10px' }}>
                    Goal: <span style={{ color: '#38e27d', fontWeight: '800' }}>{currentGoalName}</span>
                </h3>
                <p style={{ color: '#a0b2c5', marginBottom: '20px', fontSize: '0.9rem' }}>
                    {targets.description}
                </p>

                <div className="macro-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '20px',
                    textAlign: 'center'
                }}>
                    <MacroItem label="Calories" value={targets.targetCalories} unit="kcal" color="#f15955" />
                    <MacroItem label="Protein" value={targets.proteinGrams} unit="g" color="#1aace7" />
                    <MacroItem label="Carbs" value={targets.carbGrams} unit="g" color="#38e27d" />
                    <MacroItem label="Fat" value={targets.fatGrams} unit="g" color="#f7e018" />
                </div>
            </div>

            {/* --- 7-DAY PLAN NAVIGATION --- */}
            <div className="day-navigation" style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                {weekPlan && weekPlan.map((day, index) => (
                    <button
                        key={day.day}
                        onClick={() => setCurrentDayIndex(index)}
                        className={index === currentDayIndex ? 'save-btn active' : 'signout-btn'}
                        style={{ flexShrink: 0, padding: '10px 15px', fontSize: '0.9rem' }}
                    >
                        {day.day.substring(0, 3)}
                    </button>
                ))}
            </div>


            {/* --- MEAL PLAN SECTION (Current Day) --- */}
            <h3 className="fitpulse-title-section" style={{ color:'#c7d2e4', fontSize: '1.5rem', marginBottom: '25px', marginTop: '20px' }}>
                {weekPlan && weekPlan[currentDayIndex].day} Schedule ({MEAL_TEMPLATE.length} Meals)
            </h3>

            <div className="meal-plan-list" style={{
                width: '100%',
                maxWidth: '900px',
                display: 'flex',
                flexDirection: 'column',
                gap: '25px'
            }}>
                {weekPlan && weekPlan[currentDayIndex].meals.map((meal, mealIndex) => (
                    <MealCard 
                        key={meal.name} 
                        meal={meal} 
                        mealIndex={mealIndex} 
                        dayIndex={currentDayIndex}
                        handleSwap={handleSwap} 
                        showFoodDetails={showFoodDetails}
                        isCompleted={completedMeals[`${currentDayIndex}-${mealIndex}`]}
                        toggleCompletion={toggleMealCompletion}
                    />
                ))}
            </div>
            
            {/* Food Detail Modal */}
            {isFoodModalOpen && (
                <FoodDetailModal 
                    food={selectedFoodDetails} 
                    onClose={() => setIsFoodModalOpen(false)} 
                />
            )}

            {/* --- FINAL SAVE BUTTON --- */}
            <div style={{ width: '100%', maxWidth: '900px', marginTop: '40px', textAlign: 'center' }}>
                <button
                    onClick={() => logDailyTotals(currentDayIndex)} 
                    className="save-btn"
                    disabled={isSavingLog}
                    style={{ padding: '15px 40px', fontSize: '1.1rem' }}
                >
                    {isSavingLog ? 'Logging Daily Intake...' : 'Finalize & Log Daily Intake'}
                </button>
            </div>
            
        </div>
    );
}

// [All Helper Components remain the same and are appended below]
const MacroItem = ({ label, value, unit, color }) => (
    <div className="macro-item" style={{
        border: `1px solid ${color}50`,
        borderRadius: '8px',
        padding: '10px',
        background: `${color}1a`
    }}>
        <div style={{ color: color, fontSize: '1.6rem', fontWeight: '800' }}>{value}</div>
        <div style={{ color: '#a0b2c5', fontSize: '0.9rem', marginTop: '5px' }}>{label} ({unit})</div>
    </div>
);

const MealCard = ({ meal, mealIndex, dayIndex, handleSwap, showFoodDetails, isCompleted, toggleCompletion }) => (
    <div className="meal-card" style={{
        background: isCompleted ? '#38e27d1a' : '#161B22', // Light green background if completed
        border: isCompleted ? '1px solid #38e27d' : '1px solid #1a2a42',
        opacity: isCompleted ? 0.8 : 1,
        transition: 'all 0.3s ease'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ color: '#1aace7', fontSize: '1.4rem', marginBottom: '5px' }}>
                {meal.name} 
                <span style={{ fontSize: '0.9rem', color: '#a0b2c5', marginLeft: '10px' }}>{meal.time}</span>
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '1rem', color: '#a0b2c5' }}>
                    ~{Math.round(meal.macros.calories)} kcal
                </span>
                
                {/* [New Feature] Meal Completion Button */}
                <button
                    onClick={() => toggleCompletion(dayIndex, mealIndex)}
                    className={isCompleted ? 'save-btn' : 'cancel-btn'}
                    title={isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
                    style={{ 
                        padding: '8px 15px', 
                        fontSize: '0.9rem', 
                        background: isCompleted ? '#38e27d' : '#1a2a42',
                        color: isCompleted ? '#0D1117' : '#c7d2e4'
                    }}
                >
                    <i className={isCompleted ? "fas fa-check-circle" : "far fa-circle"}></i>
                </button>
            </div>
        </div>
        
        <div style={{ borderBottom: '1px dotted #1a2a42', marginBottom: '15px' }}></div>
        
        <div className="food-list-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
        }}>
            {Object.keys(meal.foods).map(foodTypeKey => {
                const item = meal.foods[foodTypeKey];
                return (
                    <FoodItem 
                        key={foodTypeKey} 
                        item={item} 
                        foodTypeKey={foodTypeKey} 
                        mealIndex={mealIndex} 
                        dayIndex={dayIndex}
                        handleSwap={handleSwap} 
                        showFoodDetails={showFoodDetails}
                    />
                );
            })}
            
        </div>
    </div>
);

const FoodItem = ({ item, foodTypeKey, mealIndex, dayIndex, handleSwap, showFoodDetails }) => (
    <div className="food-item">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Image placeholder - Clickable for details */}
            <img 
                src={item.img} 
                alt={item.name} 
                // CRITICAL FIX: Increased size from 30px to 60px (2x visual size)
                style={{ borderRadius: '50%', width: '60px', height: '60px', cursor: 'pointer', border: '2px solid #1aace7' }} 
                onClick={() => showFoodDetails(item)}
            />
            <div>
                <div 
                    style={{ color: '#c7d2e4', fontWeight: '600', fontSize: '1.1rem', cursor: 'pointer' }}
                    onClick={() => showFoodDetails(item)}
                >
                    {item.name}
                </div>
                {/* Displaying measurement in grams */}
                <div style={{ color: '#a0b2c5', fontSize: '1rem' }}>{item.quantity}</div>
            </div>
        </div>
        
        {/* Swap Button */}
        <button
            onClick={() => handleSwap(dayIndex, mealIndex, foodTypeKey)}
            className="swap-btn"
            title={`Swap ${item.name}`}
            style={{ fontSize: '1.5rem', color: '#f15955' }} // Increased size for contrast
        >
            <i className="fas fa-sync-alt"></i> {/* Font Awesome Swap Icon */}
        </button>
    </div>
);

const FoodDetailModal = ({ food, onClose }) => {
    if (!food) return null;

    return (
        <div 
            className="modal-backdrop" 
            onClick={onClose} 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: '20px'
            }}
        >
            <div 
                className="modal-content fitpulse-card" 
                onClick={e => e.stopPropagation()} 
                style={{
                    backgroundColor: '#161B22',
                    padding: '30px',
                    borderRadius: '12px',
                    maxWidth: '700px', // Increased modal size
                    width: '100%',
                    position: 'relative',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <h3 style={{ color: '#38e27d', marginBottom: '15px', fontSize: '1.8rem', borderBottom: '1px solid #38e27d50', paddingBottom: '10px' }}>
                    {food.name} Details
                </h3>
                <button 
                    onClick={onClose} 
                    className="cancel-btn"
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'none',
                        border: 'none',
                        color: '#c7d2e4',
                        fontSize: '1.5rem',
                        cursor: 'pointer'
                    }}
                >
                    &times;
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                    <img 
                        src={food.img} 
                        alt={food.name} 
                        style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #1aace7' }} // CRITICAL FIX: Increased image size for modal
                    />
                    <div>
                        <p style={{ color: '#1aace7', fontWeight: 'bold' }}>
                            Type: {food.base_unit.includes('Milk') || food.base_unit.includes('Yogurt') ? 'Dairy/Light Protein' : 
                                       (food.protein > 20 || food.base_unit.includes('Raw')) ? 'Primary Protein' : 
                                       food.carbs > 20 ? 'Complex Carb' : 'Fat Source'}</p>
                        <p style={{ color: '#a0b2c5', fontSize: '0.9rem' }}>
                            Macro Density (P/C/F): {food.protein}g / {food.carbs}g / {food.fat}g per {food.base_unit}
                        </p>
                    </div>
                </div>

                <h4 style={{ color: '#c7d2e4', marginBottom: '10px', fontSize: '1.2rem' }}>Quick Prep Guide</h4>
                <p style={{ color: '#a0b2c5', lineHeight: '1.5' }}>
                    {food.prep}
                </p>
                
                <button className="save-btn" onClick={onClose} style={{ marginTop: '30px', width: '100%' }}>
                    Close
                </button>
            </div>
        </div>
    );
};