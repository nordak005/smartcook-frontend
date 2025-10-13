/*
SmartCook - React Frontend with Backend API Integration
*/

import React, { useEffect, useState, useRef } from "react";
import { AuthModal } from "./components/Auth";
import ApiTest from "./components/ApiTest";
import SqlApiDemo from "./components/SqlApiDemo";
import { authAPI, recipeAPI, ingredientAPI, mealPlanAPI, shoppingListAPI } from "./services/api";
import sqlApi from "./services/sqlApi";

// ---------- Sample Data (fallback if API fails) ----------
const sampleRecipes = [
  {
    id: "r1",
    title: "Tomato Basil Pasta",
    description: "Quick pasta with fresh tomato sauce and basil.",
    image:
      "https://images.unsplash.com/photo-1512058564366-c9e3d26c8c34?w=1200&q=80",
    ingredients: ["pasta", "tomato", "garlic", "basil", "olive oil", "salt"],
    steps: [
      "Boil pasta until al dente.",
      "In a pan, sauté garlic in olive oil.",
      "Add chopped tomatoes and simmer.",
      "Toss pasta with sauce and fresh basil.",
      "Serve hot with a drizzle of olive oil.",
    ],
    nutrition: { calories: 450, protein: 12, carbs: 60, fat: 14 },
    tags: ["vegetarian", "quick"],
    rating: 4.6,
  },
  {
    id: "r2",
    title: "Chickpea Salad Bowl",
    description: "Protein-packed salad with roasted chickpeas and greens.",
    image:
      "https://images.unsplash.com/photo-1543352634-8dbe86e7d6f9?w=1200&q=80",
    ingredients: [
      "chickpeas",
      "lettuce",
      "tomato",
      "olive oil",
      "lemon",
      "salt",
    ],
    steps: [
      "Roast chickpeas with spices until crispy.",
      "Toss greens and tomato in a bowl.",
      "Add chickpeas and dress with lemon and olive oil.",
    ],
    nutrition: { calories: 350, protein: 14, carbs: 40, fat: 12 },
    tags: ["vegan", "gluten-free"],
    rating: 4.4,
  },
  {
    id: "r3",
    title: "Vegetable Stir Fry",
    description: "Quick wok-style veggies with soy and sesame.",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80",
    ingredients: ["broccoli", "carrot", "soy sauce", "garlic", "sesame oil"],
    steps: [
      "Chop vegetables into bite-size pieces.",
      "Stir fry garlic, add veggies and a splash of soy sauce.",
      "Finish with sesame oil and serve with rice.",
    ],
    nutrition: { calories: 300, protein: 8, carbs: 45, fat: 9 },
    tags: ["vegan", "quick"],
    rating: 4.2,
  },
];

// Weekdays for planner
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------- Utility helpers ----------
function scoreRecipeByIngredients(recipe, pantry) {
  // simple scoring: number of matching ingredients / total ingredients
  const total = recipe.ingredients.length;
  const matched = recipe.ingredients.filter((ing) =>
    pantry.includes(ing)
  ).length;
  return matched / total;
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- Main App Component ----------
export default function App() {
  // User authentication state
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("smartcook_user")) || null;
    } catch (e) {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Pantry / ingredient input
  const [pantryInput, setPantryInput] = useState("");
  const [pantry, setPantry] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("smartcook_pantry")) || [
          "tomato",
          "pasta",
          "basil",
        ]
      );
    } catch (e) {
      return ["tomato", "pasta", "basil"];
    }
  });

  const [recipes, setRecipes] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("smartcook_recipes")) || sampleRecipes
      );
    } catch (e) {
      return sampleRecipes;
    }
  });

  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(recipes);
  
  // Load recipes from API on component mount
  useEffect(() => {
    async function fetchRecipes() {
      try {
        setIsLoading(true);
        const data = await recipeAPI.getAll();
        if (data && Array.isArray(data)) {
          setRecipes(data);
        }
      } catch (error) {
        console.error("Failed to fetch recipes:", error);
        // Fallback to sample data or localStorage
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRecipes();
  }, []);

  // Meal planner state: {day: index -> [{recipeId, slotId}]}
  const [planner, setPlanner] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("smartcook_planner")) ||
        weekdays.map(() => [])
      );
    } catch (e) {
      return weekdays.map(() => []);
    }
  });

  // Load meal plan from API if user is logged in
  useEffect(() => {
    if (user && user.user_id) {
      const fetchMealPlan = async () => {
        try {
          const data = await mealPlanAPI.getByUserId(user.user_id);
          if (data && data.meal_plans && data.meal_plans.length > 0) {
            // Convert API meal plan format to our app's format
            const latestPlan = data.meal_plans[data.meal_plans.length - 1];
            
            // Create a new planner array based on the API data
            const newPlanner = weekdays.map((_, dayIndex) => {
              // Filter recipes for this day (you might need to adjust this logic based on your API structure)
              const dayRecipes = latestPlan.recipes.filter((r, i) => i % 7 === dayIndex);
              
              return dayRecipes.map(recipe => ({
                id: uid("slot"),
                recipeId: recipe.id.toString()
              }));
            });
            
            setPlanner(newPlanner);
          }
        } catch (error) {
          console.error("Failed to fetch meal plan:", error);
          // Keep using local storage data if API fails
        }
      };
      
      fetchMealPlan();
    }
  }, [user]);

  // Save data to localStorage for persistence
  useEffect(() => {
    localStorage.setItem("smartcook_pantry", JSON.stringify(pantry));
  }, [pantry]);

  useEffect(() => {
    localStorage.setItem("smartcook_recipes", JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem("smartcook_planner", JSON.stringify(planner));
    
    // If user is logged in, also save to backend
    if (user && user.user_id) {
      const saveMealPlan = async () => {
        try {
          // Flatten the planner to get all recipe IDs
          const recipeIds = planner.flat().map(slot => {
            const recipeId = parseInt(slot.recipeId.replace(/\D/g, ''));
            return isNaN(recipeId) ? null : recipeId;
          }).filter(id => id !== null);
          
          // Create a meal plan request
          const mealPlanData = {
            user_id: user.user_id,
            week: new Date().toISOString().slice(0, 10), // Current date as week identifier
            recipe_ids: recipeIds
          };
          
          await mealPlanAPI.create(mealPlanData);
        } catch (error) {
          console.error("Failed to save meal plan to backend:", error);
          // Continue using local storage even if API fails
        }
      };
      
      saveMealPlan();
    }
  }, [planner, user]);

  // Filter recipes by search query and ingredient match
  useEffect(() => {
    const q = query.trim().toLowerCase();
    
    // Local filtering for immediate response
    let res = recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
    
    // Sort by ingredient match with pantry (desc)
    res = res
      .map((r) => ({ r, score: scoreRecipeByIngredients(r, pantry) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r);

    setFiltered(res);
    
    // If we have ingredients in pantry, also fetch recommendations from API
    if (pantry.length > 0) {
      const fetchRecommendations = async () => {
        try {
          const data = await recipeAPI.recommend(pantry);
          if (data && data.recommended && Array.isArray(data.recommended)) {
            // Merge API recommendations with local results, prioritizing API results
            const apiIds = new Set(data.recommended.map(r => r.id));
            const localResults = res.filter(r => !apiIds.has(r.id));
            setFiltered([...data.recommended, ...localResults]);
          }
        } catch (error) {
          console.error("Failed to fetch recipe recommendations:", error);
          // Keep local results if API fails
        }
      };
      
      fetchRecommendations();
    }
  }, [query, recipes, pantry]);

  // Recommendation: top recipes by pantry match
  const recipeRecommendations = React.useMemo(() => {
    // Start with local recommendations
    const localRecs = recipes
      .map((r) => ({ r, s: scoreRecipeByIngredients(r, pantry) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((x) => x.r);
    
    // If user is logged in, try to get personalized recommendations
    if (user) {
      const fetchPersonalizedRecs = async () => {
        try {
          const data = await recipeAPI.recommend(pantry);
          if (data && data.recommended && Array.isArray(data.recommended)) {
            return data.recommended.slice(0, 6);
          }
          return localRecs;
        } catch (error) {
          console.error("Failed to fetch personalized recommendations:", error);
          return localRecs;
        }
      };
      
      fetchPersonalizedRecs().then(recs => {
        if (recs !== localRecs) {
          // Only update if we got different recommendations
          // State for SQL API recommendations
          const [sqlRecommendations, setSqlRecommendations] = useState([]);
          setSqlRecommendations(recs);
        }
      });
    }
    
    return localRecs;
  }, [recipes, pantry, user]);
  
  // State for SQL API recommendations
  const [sqlRecommendations, setSqlRecommendations] = useState([]);
  
  // State for API test visibility
  const [showApiTest, setShowApiTest] = useState(false);
  const [showSqlApiDemo, setShowSqlApiDemo] = useState(false);

  // ---------- Recipe Modal ----------
  const [openRecipe, setOpenRecipe] = useState(null);

  // ---------- Voice (TTS) ----------
  const synthRef = useRef(window.speechSynthesis || null);
  const utterRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (synthRef.current && synthRef.current.speaking)
        synthRef.current.cancel();
    };
  }, []);

  function startVoiceGuide(steps) {
    if (!synthRef.current)
      return alert("Speech synthesis not supported in this browser.");
    if (synthRef.current.speaking) synthRef.current.cancel();

    setCurrentStepIdx(0);
    const utter = new SpeechSynthesisUtterance(steps[0]);
    utter.rate = 1;
    utter.onend = () => {
      setIsSpeaking(false);
    };
    utterRef.current = { utter, steps };
    synthRef.current.speak(utter);
    setIsSpeaking(true);
  }

  function speakStepAt(index) {
    const steps = utterRef.current?.steps || openRecipe?.steps || [];
    if (!synthRef.current || !steps[index]) return;
    if (synthRef.current.speaking) synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(steps[index]);
    utter.onend = () => setIsSpeaking(false);
    utterRef.current = { utter, steps };
    synthRef.current.speak(utter);
    setIsSpeaking(true);
    setCurrentStepIdx(index);
  }

  function stopVoice() {
    if (synthRef.current && synthRef.current.speaking)
      synthRef.current.cancel();
    setIsSpeaking(false);
  }

  function nextStep() {
    const steps = openRecipe?.steps || [];
    const next = Math.min(currentStepIdx + 1, steps.length - 1);
    speakStepAt(next);
  }

  function prevStep() {
    const prev = Math.max(currentStepIdx - 1, 0);
    speakStepAt(prev);
  }

  // ---------- Meal Planner Drag & Drop ----------
  function onDragStart(e, recipeId) {
    e.dataTransfer.setData("text/plain", recipeId);
  }

  function onDropToDay(e, dayIndex) {
    e.preventDefault();
    const recipeId = e.dataTransfer.getData("text/plain");
    if (!recipeId) return;
    setPlanner((p) => {
      const copy = p.map((arr) => arr.slice());
      copy[dayIndex].push({ id: uid("slot"), recipeId });
      return copy;
    });
  }

  // remove slot
  function removeSlot(dayIdx, slotId) {
    setPlanner((p) => {
      const copy = p.map((arr) => arr.filter((s) => s.id !== slotId));
      return copy;
    });
  }

  // Update shopping list when planner or pantry changes
  const [shoppingList, setShoppingList] = useState([]);
  
  useEffect(() => {
    async function updateShoppingList() {
      if (user && user.user_id) {
        try {
          const data = await shoppingListAPI.generate(user.user_id);
          if (data && data.shopping_list) {
            setShoppingList(data.shopping_list);
            return;
          }
        } catch (error) {
          console.error("Failed to fetch shopping list:", error);
        }
      }
      
      // Client-side fallback generation
      const needed = {};
      planner.flat().forEach((slot) => {
        const r = recipes.find((x) => x.id === slot.recipeId);
        if (!r) return;
        r.ingredients.forEach((ing) => {
          if (!pantry.includes(ing)) needed[ing] = (needed[ing] || 0) + 1;
        });
      });
      setShoppingList(Object.keys(needed));
    }
    
    updateShoppingList();
  }, [user, planner, pantry, recipes]);

  // ---------- Add Recipe (simple form) ----------
  const [showAdd, setShowAdd] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    title: "",
    description: "",
    ingredients: "",
    steps: "",
  });

  function submitNewRecipe() {
    if (!newRecipe.title) return alert("Add a title");
    const r = {
      id: uid("r"),
      title: newRecipe.title,
      description: newRecipe.description,
      image:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
      ingredients: newRecipe.ingredients
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      steps: newRecipe.steps
        .split("||")
        .map((s) => s.trim())
        .filter(Boolean),
      nutrition: { calories: 300 },
      tags: [],
      rating: 5,
    };
    setRecipes((rprev) => [r, ...rprev]);
    setShowAdd(false);
    setNewRecipe({ title: "", description: "", ingredients: "", steps: "" });
  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">SmartCook</h1>
            <p className="text-sm text-neutral-600">
              AI-friendly recipe assistant — frontend demo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setShowAdd((s) => !s)}
            >
              + Add Recipe
            </button>
            <button
              className="px-3 py-2 rounded-md border border-neutral-200 hover:bg-neutral-100"
              onClick={() => {
                localStorage.clear();
                setPantry(["tomato", "pasta", "basil"]);
                setRecipes(sampleRecipes);
                setPlanner(weekdays.map(() => []));
                alert("Reset demo data (localStorage cleared)");
              }}
            >
              Reset
            </button>
            {user ? (
              <button
                className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setShowAuthModal(false)}
              >
                Logout ({user.username || user.email})
              </button>
            ) : (
              <button
                className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setShowAuthModal(true)}
              >
                Login
              </button>
            )}
            <button
                className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={() => setShowApiTest(!showApiTest)}
              >
                {showApiTest ? 'Hide API Test' : 'Test API'}
              </button>
              <button
                className="px-3 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                onClick={() => setShowSqlApiDemo(!showSqlApiDemo)}
              >
                {showSqlApiDemo ? 'Hide SQL Demo' : 'SQL API Demo'}
              </button>
          </div>
        </header>

        {/* Pantry + Ingredient input */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <input
                value={pantryInput}
                onChange={(e) => setPantryInput(e.target.value)}
                placeholder="Add an ingredient (e.g., tomato)"
                className="flex-1 px-3 py-2 border rounded-md"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = pantryInput.trim().toLowerCase();
                    if (!val) return;
                    setPantry((p) => Array.from(new Set([val, ...p])));
                    setPantryInput("");
                  }
                }}
              />
              <button
                className="px-3 py-2 rounded-md bg-blue-600 text-white"
                onClick={() => {
                  const val = pantryInput.trim().toLowerCase();
                  if (!val) return;
                  setPantry((p) => Array.from(new Set([val, ...p])));
                  setPantryInput("");
                }}
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {pantry.map((ing) => (
                <span
                  key={ing}
                  className="bg-amber-100 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {ing}
                  <button
                    className="ml-2 text-amber-600"
                    onClick={() => setPantry((p) => p.filter((x) => x !== ing))}
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="mt-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search recipes by name or description"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Recommendations */}
            <div className="mt-4">
              <h3 className="font-semibold">Recommended for you</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recipeRecommendations.map((r) => (
                  <article
                    key={r.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, r.id)}
                    className="bg-white rounded-lg overflow-hidden shadow-sm cursor-grab"
                  >
                    <img
                      src={r.image}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                    <div className="p-3">
                      <h4 className="font-semibold">{r.title}</h4>
                      <p className="text-xs text-neutral-500">
                        {r.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-neutral-600">
                          {r.ingredients.length} ingredients
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs rounded border"
                            onClick={() => {
                              setOpenRecipe(r);
                            }}
                          >
                            View
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded bg-emerald-600 text-white"
                            onClick={() => {
                              // quick add to today's first slot
                              setPlanner((p) => {
                                const copy = p.map((arr) => arr.slice());
                                copy[0].push({
                                  id: uid("slot"),
                                  recipeId: r.id,
                                });
                                return copy;
                              });
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          {/* Shopping list & small controls */}
          <aside className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-2">Shopping List (auto)</h3>
            {shoppingList.length === 0 ? (
              <div className="text-sm text-neutral-500">
                No missing ingredients from your planner — good job!
              </div>
            ) : (
              <ul className="list-disc list-inside text-sm">
                {shoppingList.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}

            <div className="mt-4">
              <h4 className="font-medium">Quick Controls</h4>
              <div className="mt-2 flex flex-col gap-2">
                <button
                  className="px-3 py-2 rounded-md bg-blue-600 text-white"
                  onClick={() =>
                    navigator.clipboard?.writeText(shoppingList.join(", "))
                  }
                >
                  Copy Shopping List
                </button>
                <button
                  className="px-3 py-2 rounded-md border"
                  onClick={() =>
                    alert(
                      "Export to Google Keep or Notion: Not implemented in demo"
                    )
                  }
                >
                  Export
                </button>
              </div>
            </div>

            <div className="mt-4 text-xs text-neutral-500">
              Drag recipes from recommendations into planner below.
            </div>
          </aside>
        </section>

        {/* Add Recipe Form (simple) */}
        {showAdd && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <h3 className="font-semibold mb-2">Add a New Recipe (demo)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={newRecipe.title}
                onChange={(e) =>
                  setNewRecipe((s) => ({ ...s, title: e.target.value }))
                }
                placeholder="Title"
                className="px-3 py-2 border rounded-md"
              />
              <input
                value={newRecipe.ingredients}
                onChange={(e) =>
                  setNewRecipe((s) => ({ ...s, ingredients: e.target.value }))
                }
                placeholder="Ingredients (comma separated)"
                className="px-3 py-2 border rounded-md"
              />
              <input
                value={newRecipe.steps}
                onChange={(e) =>
                  setNewRecipe((s) => ({ ...s, steps: e.target.value }))
                }
                placeholder="Steps (separate with || )"
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className="px-3 py-2 bg-emerald-600 text-white rounded"
                onClick={submitNewRecipe}
              >
                Save Recipe
              </button>
              <button
                className="px-3 py-2 border rounded"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Recipes List */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">
            Recipes ({filtered.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-lg overflow-hidden shadow-sm"
              >
                <img
                  src={r.image}
                  alt=""
                  className="h-44 w-full object-cover"
                />
                <div className="p-3">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="text-xs text-neutral-500">{r.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-neutral-600">
                      {Math.round(scoreRecipeByIngredients(r, pantry) * 100)}%
                      match
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs rounded border"
                        onClick={() => setOpenRecipe(r)}
                      >
                        View
                      </button>
                      <button
                        className="px-2 py-1 text-xs rounded bg-emerald-600 text-white"
                        onClick={() =>
                          setPlanner((p) => {
                            const copy = p.map((arr) => arr.slice());
                            copy[0].push({ id: uid("slot"), recipeId: r.id });
                            return copy;
                          })
                        }
                      >
                        Add to Planner
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Meal Planner */}
        <section className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Meal Planner (Weekly)</h2>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {planner.map((daySlots, idx) => (
              <div
                key={idx}
                className="p-2 border rounded-md min-h-[120px] bg-neutral-50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropToDay(e, idx)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{weekdays[idx]}</div>
                  <div className="text-xs text-neutral-500">
                    {daySlots.length} items
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {daySlots.map((s) => {
                    const r = recipes.find((x) => x.id === s.recipeId);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm"
                      >
                        <div className="text-sm">{r?.title || "Unknown"}</div>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs px-2 py-1 border rounded"
                            onClick={() => setOpenRecipe(r)}
                          >
                            View
                          </button>
                          <button
                            className="text-xs px-2 py-1 border rounded"
                            onClick={() => removeSlot(idx, s.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer / small notes */}
        <footer className="text-sm text-neutral-500 mt-6 mb-12">
          Demo frontend. Connect to a backend and nutrition API to unlock full
          functionality.
        </footer>
      </div>

      {/* API Test Component */}
      {showApiTest && (
        <div className="mb-6">
          <ApiTest user={user} />
        </div>
      )}
      
      {/* SQL API Demo Component */}
      {showSqlApiDemo && (
        <div className="mb-6">
          <SqlApiDemo />
        </div>
      )}

      {/* Recipe Modal (simple) */}
      {openRecipe && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-3xl w-full rounded-lg overflow-auto max-h-[90vh]">
            <div className="flex items-start justify-between p-4 border-b">
              <div>
                <h3 className="text-xl font-semibold">{openRecipe.title}</h3>
                <p className="text-sm text-neutral-500">
                  {openRecipe.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 border"
                  onClick={() => setOpenRecipe(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <img
                  src={openRecipe.image}
                  alt=""
                  className="w-full h-64 object-cover rounded-lg mb-3"
                />
                <h4 className="font-semibold mb-2">Ingredients</h4>
                <ul className="list-disc list-inside">
                  {openRecipe.ingredients.map((ing) => (
                    <li
                      key={ing}
                      className={
                        pantry.includes(ing)
                          ? "text-neutral-800"
                          : "text-red-600"
                      }
                    >
                      {ing}
                    </li>
                  ))}
                </ul>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Steps</h4>
                  <div className="space-y-2">
                    {openRecipe.steps.map((st, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded ${
                          i === currentStepIdx ? "bg-amber-50" : "bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-medium">
                              Step {i + 1}
                            </div>
                            <div className="text-sm text-neutral-700">{st}</div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              className="px-2 py-1 border text-xs rounded"
                              onClick={() => speakStepAt(i)}
                            >
                              Say
                            </button>
                            <button
                              className="px-2 py-1 border text-xs rounded"
                              onClick={() => {
                                setPantry((p) =>
                                  Array.from(
                                    new Set([...p, ...openRecipe.ingredients])
                                  )
                                );
                                alert(
                                  "Added recipe ingredients to pantry (demo)"
                                );
                              }}
                            >
                              Add to Pantry
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className="px-3 py-2 rounded bg-emerald-600 text-white"
                      onClick={() => startVoiceGuide(openRecipe.steps)}
                    >
                      Start Voice Guide
                    </button>
                    <button
                      className="px-3 py-2 border rounded"
                      onClick={prevStep}
                    >
                      Prev
                    </button>
                    <button
                      className="px-3 py-2 border rounded"
                      onClick={nextStep}
                    >
                      Next
                    </button>
                    <button
                      className="px-3 py-2 border rounded"
                      onClick={stopVoice}
                    >
                      Stop
                    </button>
                    <div className="text-sm text-neutral-500">
                      {isSpeaking ? "Speaking..." : "Idle"}
                    </div>
                  </div>
                </div>
              </div>

              <aside>
                <div className="bg-neutral-50 p-3 rounded-lg">
                  <h4 className="font-semibold">Nutrition</h4>
                  <div className="mt-2 text-sm">
                    <div>Calories: {openRecipe.nutrition?.calories ?? "—"}</div>
                    <div>Protein: {openRecipe.nutrition?.protein ?? "—"} g</div>
                    <div>Carbs: {openRecipe.nutrition?.carbs ?? "—"} g</div>
                    <div>Fat: {openRecipe.nutrition?.fat ?? "—"} g</div>
                  </div>

                  <div className="mt-4">
                    <h5 className="font-medium">Actions</h5>
                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
                        onClick={() => {
                          // quick add to planner
                          setPlanner((p) => {
                            const copy = p.map((arr) => arr.slice());
                            copy[0].push({
                              id: uid("slot"),
                              recipeId: openRecipe.id,
                            });
                            return copy;
                          });
                          alert("Added to Monday in planner (demo)");
                        }}
                      >
                        Add to Planner
                      </button>
                      <button
                        className="px-3 py-2 border rounded text-sm"
                        onClick={() => alert("Share: Not implemented in demo")}
                      >
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
