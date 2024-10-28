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
    const currentTimestamp = now.getTime();
    const todayTimestamp = today.getTime(); // Get the timestamp for today
    // Calculate the timestamp for 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 2); // Subtract 2 to include today as day 1
    threeDaysAgo.setHours(0, 0, 0, 0); // Set to midnight
    const threeDaysTimestamp = threeDaysAgo.getTime();
    
    // Filter users who signed in today based on lastActiveAt
    const usersSignedInToday = data.filter(user => {
      // Check if lastActiveAt is not null and is greater than or equal to todayTimestamp
      return user.lastSignInAt !== null && user.lastSignInAt >= todayTimestamp;
    });

     // Filter users who signed up in the past 3 days based on createdAt
    const usersSignInThreeDays = data.filter(user => 
      user.lastSignInAt !== null && user.lastSignInAt >= threeDaysTimestamp
    );

    return NextResponse.json({
      totalUsers: totalCount,  // Total count of users
      totalSignedInToday: usersSignedInToday.length, // Count of users who signed in today
      totalSignIns3Days : usersSignInThreeDays.length, 
      users: usersSignedInToday, // Return the filtered user data
    });
  } catch (error) {
    console.error("Error fetching user data from Clerk:", error);
    return NextResponse.json({ error: 'Failed to fetch user data from Clerk.' }, { status: 500 });
  }
}
