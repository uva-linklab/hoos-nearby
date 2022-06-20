### How to setup a policy?
Let's look at a few example scenarios and how to create equivalent policies on the gateway platform. The scenarios are:

1. I want to <ins>block</ins> <ins>application 1 (app1)</ins> from <ins>sensor1 (s1)</ins> <ins>in the morning from 6 to 7 every day</ins>.
2. I <ins>do not want</ins> <ins>application 2 (app2)</ins> to get <ins>any sensor data</ins> during the working hours <ins>(8 am to 5 pm)</ins>.
3. I want to <ins>allow</ins> only <ins>sensor 2 (s2)</ins> and <ins>sensor 3 (s3)</ins> to be accessed by <ins>any application</ins> <ins>in the afternoon (12 pm to 5 pm)</ins>.
<br>
<br>

The privacy polilcy for these scenarios would be specified as shown below:
<table class="table">
   <thead>
      <tr>
         <th scope="col" colspan="5" style="text-align:center;">Privacy Policy</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td scope="col">#</td>
         <td scope="col">Sensors</td>
         <td scope="col">Apps</td>
         <td scope="col">Schedule</td>
         <td scope="col" >Block/Allow</td>
      </tr>
      <tr>
         <th scope="row">1</th>
         <td >s1</td>
         <td >app1</td>
         <td >* 06-07 * *</td>
         <td >Block</td>
      </tr>
      <tr>
         <th scope="row">2</th>
         <td >*</td>
         <td >app2</td>
         <td >* 08-17 * *</td>
         <td >Block</td>
      </tr>
      <tr>
         <th scope="row">3</th>
         <td >s2,s3</td>
         <td >*</td>
         <td >* 12-17 * *</td>
         <td >Allow</td>
      </tr>
   </tbody>
</table>
<br>

Every policy has four component:
1. Sensors:

    The sensor(s) you want to set for your policy.
2. Apps:

    The app(s) you want to set for your policy.
3. Schedule:

    Cron like schedule format
    ```
    *    *    *    *
    ┬    ┬    ┬    ┬
    │    │    │    │
    │    │    │    │
    │    │    │    └───── month (1 - 12)
    │    │    └────────── day of month (1 - 31)
    │    └─────────────── hour (0 - 23)
    └──────────────────── minute (0 - 59)
    ```
4. Block/Allow:

    - Block: During the scheduled time, sensors will be blocked from apps.
    - Allow: During the scheduled time, sensors will be allowed to apps.
<br>
<br>

### Tips for setting up the policy
1. When picking the time in the schedule, you are picking up a range between a start time and an end time and both time are included. For example, if you set the schedule "\* 13-17 \* \*", it will <ins>start at 13:00 and end after 17:59</ins>.
2. When picking "\*", do not pick any other options.
3. Remember to click the "Set Policy" button after you have picked the policy.
<br>
<br>

### Now try setting your own policy!
<br>
<br>
