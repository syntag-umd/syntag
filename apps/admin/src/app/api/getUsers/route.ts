import { clerkClient } from '@clerk/clerk-sdk-node';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch the user list from Clerk
    const userListResponse = await clerkClient.users.getUserList();

    // Destructure the users array from the response
    const { data, totalCount } = userListResponse;

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date(); // Current date and time
    const todayTimestamp = today.getTime(); // Get the timestamp for today

    // Calculate the timestamp for 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 2); // Subtract 2 to include today as day 1
    threeDaysAgo.setHours(0, 0, 0, 0); // Set to midnight
    const threeDaysTimestamp = threeDaysAgo.getTime();

    // Calculate the timestamp for 7 days ago (1 week)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6); // Subtract 6 to include today as day 1
    weekAgo.setHours(0, 0, 0, 0); // Set to midnight
    const weekTimestamp = weekAgo.getTime();

    // Calculate the timestamp for 30 days ago (1 month)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 29); // Subtract 29 to include today as day 1
    monthAgo.setHours(0, 0, 0, 0); // Set to midnight
    const monthTimestamp = monthAgo.getTime();

    // Filter users who signed in today based on lastSignInAt
    const usersSignedInToday = data.filter(user => {
      // Check if lastSignInAt is not null and is greater than or equal to todayTimestamp
      return user.lastSignInAt !== null && user.lastSignInAt >= todayTimestamp;
    });

    // Filter users who signed in in the past 3 days based on lastSignInAt
    const usersSignInThreeDays = data.filter(user => 
      user.lastSignInAt !== null && user.lastSignInAt >= threeDaysTimestamp
    );

    // Filter users who signed in in the past week based on lastSignInAt
    const usersSignInWeek = data.filter(user => 
      user.lastSignInAt !== null && user.lastSignInAt >= weekTimestamp
    );

    // Filter users who signed in in the past month based on lastSignInAt
    const usersSignInMonth = data.filter(user => 
      user.lastSignInAt !== null && user.lastSignInAt >= monthTimestamp
    );

    return NextResponse.json({
      totalUsers: totalCount,  // Total count of users
      totalSignedInToday: usersSignedInToday.length, // Count of users who signed in today
      totalSignIns3Days: usersSignInThreeDays.length, // Count of users who signed in the past 3 days
      totalSignInsWeek: usersSignInWeek.length, // Count of users who signed in the past week
      totalSignInsMonth: usersSignInMonth.length, // Count of users who signed in the past month
      users: usersSignedInToday, // Return the filtered user data for today
    });
  } catch (error) {
    console.error("Error fetching user data from Clerk:", error);
    return NextResponse.json({ error: 'Failed to fetch user data from Clerk.' }, { status: 500 });
  }
}
