import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { MessMenu } from "@/lib/db/models/MessMenu";
import { getUserFromRequest } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

// Default realistic university hostel weekly menu
const DEFAULT_WEEKLY_MENU = [
  {
    dayOfWeek: 0, // Sunday
    breakfast: ["Aloo Paratha with Curd & Pickle", "Boiled Eggs", "Butter & Toast", "Tea / Coffee"],
    lunch: ["Chicken Biryani / Paneer Biryani", "Mirchi Ka Salan", "Boondi Raita", "Gulab Jamun"],
    snacks: ["Samosa & Green Chutney", "Masala Chai"],
    dinner: ["Jeera Rice", "Dal Makhani", "Tandoori Roti", "Mixed Veg", "Ice Cream"],
    timings: {
      breakfast: "08:00 - 10:00 AM",
      lunch: "12:30 - 02:30 PM",
      snacks: "04:30 - 05:45 PM",
      dinner: "07:30 - 09:30 PM",
    },
    specialNotes: "Sunday Feast Special!",
  },
  {
    dayOfWeek: 1, // Monday
    breakfast: ["Idli & Medu Vada", "Sambar", "Coconut & Tomato Chutney", "Coffee / Milk"],
    lunch: ["Steamed Basmati Rice", "Yellow Dal Tadka", "Bhindi Do Pyaza", "Chapati", "Curd"],
    snacks: ["Veg Puff / Bun Maska", "Cardamom Tea"],
    dinner: ["Fried Rice", "Veg Manchurian", "Roti", "Dal Fry", "Seasonal Fruit"],
    timings: {
      breakfast: "07:30 - 09:30 AM",
      lunch: "12:30 - 02:30 PM",
      snacks: "04:30 - 05:30 PM",
      dinner: "07:30 - 09:30 PM",
    },
    specialNotes: "Start of the week healthy energy meal",
  },
  {
    dayOfWeek: 2, // Tuesday
    breakfast: ["Poha with Peanuts & Sev", "Boiled Sprouts", "Boiled Egg / Bananas", "Tea / Milk"],
    lunch: ["Rice", "Sambhar", "Paneer Butter Masala", "Phulka", "Cucumber Salad"],
    snacks: ["Pav Bhaji / Biscuits", "Filter Coffee"],
    dinner: ["Peas Pulao", "Kadhi Pakora", "Aloo Gobi Dry", "Roti", "Kheer"],
    timings: {
      breakfast: "07:30 - 09:30 AM",
      lunch: "12:30 - 02:30 PM",
      snacks: "04:30 - 05:30 PM",
      dinner: "07:30 - 09:30 PM",
    },
    specialNotes: "",
  },
  {
    dayOfWeek: 3, // Wednesday
    breakfast: ["Masala Dosa", "Potato Masala", "Sambar", "Chutney", "Tea / Coffee"],
    lunch: ["Rice", "Rajma Masala", "Jeera Aloo", "Tawa Roti", "Fresh Buttermilk"],
    snacks: ["Bhel Puri / Sweet Corn", "Masala Chai"],
    dinner: ["Egg Curry / Shahi Paneer", "Steamed Rice", "Laccha Paratha", "Rasgulla"],
    timings: {
      breakfast: "07:30 - 09:30 AM",
      lunch: "12:30 - 02:30 PM",
      snacks: "04:30 - 05:30 PM",
      dinner: "07:30 - 09:30 PM",
    },
    specialNotes: "Midweek Special Protein Dinner",
  },
  {
    dayOfWeek: 4, // Thursday
    breakfast: ["Upma with Coconut Chutney", "Omelette / Banana", "Bread & Jam", "Tea / Milk"],
    lunch: ["Lemon Rice", "Plain Rice", "Dal Palak", "Chole Masala", "Poori", "Curd"],
    snacks: ["Bread Pakora", "Ginger Tea"],
    dinner: ["Khichdi & Kadhi / Rice & Dal", "Aloo Beans Sabzi", "Chapati", "Papad", "Sewaiyan"],
    timings: {
      breakfast: "07:30 - 09:30 AM",
      lunch: "12:30 - 02:30 PM",
      snacks: "04:30 - 05:30 PM",
      dinner: "07:30 - 09:30 PM",
    },
    specialNotes: "",
  },
  {
    dayOfWeek: 5, // Friday
    breakfast: ["Uttapam with Sambar & Chutney", "Boiled Eggs", "Toast & Butter", "Coffee / Tea"],
    lunch: ["Veg Biryani / Steamed Rice", "Dal Fry", "Dum Aloo Kashmiri", "Bhatura / Roti", "Raita"],
    snacks: ["Mirchi Bajji / Onion Pakoda", "Masala Chai"],
    dinner: ["Fish Curry / Kadhai Mushroom", "Steamed Rice", "Rumali Roti", "Moong Dal Halwa"],
    timings: {
      breakfast: "07:30 - 09:30 AM",
      lunch: "12:30 - 02:30 PM",
      snacks: "04:30 - 05:30 PM",
      dinner: "07:30 - 09:30 PM",
    },
    specialNotes: "Friday Night Treat!",
  },
  {
    dayOfWeek: 6, // Saturday
    breakfast: ["Poori with Aloo Bhaji", "Boiled Chana", "Cornflakes & Milk", "Tea"],
    lunch: ["Curd Rice", "Sambar Rice", "Potato Fry", "Papad", "Pickle"],
    snacks: ["Maggi / White Sauce Pasta", "Hot Chocolate / Tea"],
    dinner: ["Veg Hakka Noodles", "Chilli Paneer Gravy", "Fried Rice", "Ice Cream Sundae"],
    timings: {
      breakfast: "07:30 - 09:30 AM",
      lunch: "12:30 - 02:30 PM",
      snacks: "04:30 - 05:30 PM",
      dinner: "07:30 - 09:30 PM",
    },
    specialNotes: "Weekend Chinese & Fun Night",
  },
];

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const todayOnly = searchParams.get("today") === "true";

    // Check if user has menu saved
    let menus = await MessMenu.find({ userId: user.userId }).sort({ dayOfWeek: 1 });

    // If no menu exists, seed with default realistic college menu for the user
    if (menus.length === 0) {
      const seedDocs = DEFAULT_WEEKLY_MENU.map((m) => ({
        ...m,
        userId: user.userId,
      }));
      await MessMenu.insertMany(seedDocs);
      menus = await MessMenu.find({ userId: user.userId }).sort({ dayOfWeek: 1 });
    }

    // Determine day of week in IST
    const now = new Date();
    const istDayOfWeek = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    ).getDay();

    if (todayOnly) {
      const todayMenu = menus.find((m) => m.dayOfWeek === istDayOfWeek) || menus[0];
      return NextResponse.json({
        success: true,
        menu: todayMenu,
        dayOfWeek: istDayOfWeek,
      });
    }

    return NextResponse.json({
      success: true,
      menus,
      currentDayOfWeek: istDayOfWeek,
    });
  } catch (error: any) {
    console.error("GET /api/mess-menu error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch mess menu" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    const { dayOfWeek, breakfast, lunch, snacks, dinner, timings, specialNotes } = body;

    if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { success: false, message: "Valid dayOfWeek (0-6) is required" },
        { status: 400 }
      );
    }

    const updated = await MessMenu.findOneAndUpdate(
      { userId: user.userId, dayOfWeek },
      {
        breakfast: Array.isArray(breakfast) ? breakfast : (breakfast || "").split(",").map((s: string) => s.trim()).filter(Boolean),
        lunch: Array.isArray(lunch) ? lunch : (lunch || "").split(",").map((s: string) => s.trim()).filter(Boolean),
        snacks: Array.isArray(snacks) ? snacks : (snacks || "").split(",").map((s: string) => s.trim()).filter(Boolean),
        dinner: Array.isArray(dinner) ? dinner : (dinner || "").split(",").map((s: string) => s.trim()).filter(Boolean),
        timings: timings || {
          breakfast: "07:30 - 09:30 AM",
          lunch: "12:30 - 02:30 PM",
          snacks: "04:30 - 05:45 PM",
          dinner: "07:30 - 09:30 PM",
        },
        specialNotes: specialNotes || "",
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Mess menu updated successfully",
      menu: updated,
    });
  } catch (error: any) {
    console.error("POST /api/mess-menu error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update mess menu" },
      { status: 500 }
    );
  }
}
