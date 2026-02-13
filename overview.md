# OVERVIEW

An **AI Travel Agency** that is also a **social media platform** for users to create, edit, save and share their travel plans and store their past travels in a **trip diary**. AI will facilitate the creation and suggestion of places and activities users will go in order to make user's decisions way easier. The **magic** sauce of the AI would be to have heavy consideration of different variables to make sure the trip of the user would be excellent. The platform nicknamed "*The Instagram of travel*" would also have an **explore page** where people would post their adventures and inspire others to copy their trip. Users with multiple copied trips that were already booked would be **rewarded** with discounts on their next trips to be encouraged to keep building their accounts and sharing with people.


## Technical Overview
This is the current workflow of the site, of which would change many times:

*The front end is created mostly by Claude Code while the back end is based on an n8n workflow. The front end sends API requests to n8n of basic itinerary questions filled by the user, n8n then asks a bunch of APIs about different parameters about the trip such as flights, accommodation, restaurants, sightseeing, travel insurance, climate, visas, costs, transportation and so much more. Then it comes to conclusions, sending back to the user the best results. The format of the itinerary is JSON objects where each slot has its own data structured in a timely manner from the beginning of the trip till the end. The back-end sends back all the relevant info of which can later be rearranged by the user*


# The Magic
The backend AI will consider the following things before evaluating what trip is best:

## Flights
- According to budget it will find multiple flights going from origin to destination and back
- Pick the best one suited for the travelers
- Think outside the box and find mid-stop that could be their own 1-4 day vacations in-between

## Accommodation
- Scan through thousands of hotels figure out which one is best for the budget
- Consider if there is breakfast or all-inclusive in the deal, adjust costs and activities accordingly
- Longer trips could have multiple locations for different activities in each area

## Activities
- Find the most common and trendy activities in that area
- Also suggest underrated activities and locations
- Based on user's preferences find the best activities
- Consider the traveller's endurance to space out activities beautifully

## Misc
- Consider if passport of origin is suitable for travel to all the countries included (even if it's just the airport) and send them to the government's site for further guidance on visas
- Consider the weather and climate of the destination to recommend the appropriate precautions and clothing, suggest to change the dates for better weather

## Overall Evaluation
- Consider the endurance of the whole trip and if any activities need to be rearranged for a better experience
- Consider if the overall experience in the budget makes sense
- Consider the locations are as close as possible for the preferences, if not reevaluate the accommodation and activities.

# Trip Diary
On their personal page, users will have a diary of their past trips and a bucket list for their future plans (as they saved the itineraries). If not signed in, the itineraries would be stored locally in the browser, while signed in users would have a cloud (stored in our database) storage. They could then choose to make their planned or past trips public, friends only or private (can be changed in settings, default is friends only which is when 2 accounts follow each other).
## Diary 'past' trips
Any trips created with past dates will automatically be diary (past) trips. They will likely have reviews/comments of places they've been, pictures they took on each location of the trip and if they want to, they can share the prices as well! Tags of other accounts could also be added in the commentary. If public or friends only, people would be able to see their trips in the explore page and mark them as favourite or even copy their itinerary that auto adjusts to future dates.
There would also be a map mode where they see on a map which places they've travelled to and with whom (again, public or private up to them). They could also rank their trips.
On a public or a friend's account you would basically be able to see what trips they took, where and what they thought of each one.

## Bucket 'future' trips
Any future trips would be the bucket list trips of which people would like to go to. Favourite/copied trips would also be here without a specific date yet. Suggestions of what activities to add and adjust could also be present somewhere in the itinerary page.
There could also be grouped itineraries where multiple accounts are linked to the same itinerary with commentary and suggestions in case all users are going together.

# Explore page
This is where the fun is! Social media to the fullest potential for travelling. From friends to random locations and trips to suggested activities, etc...
People would be able to copy itineraries or single activities or accommodation.
Share trips with others, create grouped itineraries from the copied trips and discuss about them.

The algorithm will see where people have travelled to, what their future plans are and adjust algorithm accordingly. Filters, search, map and pricing could also be added in the explore page if the user decides to see something specific.