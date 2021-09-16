1. What are the tradeoffs when it comes to optimizing for availability vs consistency?
- it completely depends that what we are building, if we build heavily read applications like e-commerce/social media then availability is important.
- or if we need strong consistency then we have to optimize the consistency.


2. In a real world scenario, if you only had to choose between availability and consistency, which criteria would you pick and why?
- if i build a read-heavy application then i will choose availability over consistency because i need to read them ASAP that's why we need many slave nodes (Redis).
- or if we build some application where we need to follow ACID properties then i will choose consistency over availability.

3. Is it possible to get both - a highly available and highly consitent data all the time? If no, then why? If yes, then how?
-  if we have high availability then we cannot have true(strong) consistency, but we can still provide eventual consistency. strong consistency blocks the read until all the slave node is updated. this is highly affected on availability, that's why we can't have high availability and strong consistency all the time.