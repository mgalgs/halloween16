/* Ping))) Sensor

  This sketch reads a PING))) ultrasonic rangefinder and returns the
  distance to the closest object in range. To do this, it sends a pulse
  to the sensor to initiate a reading, then listens for a pulse
  to return. The length of the returning pulse is proportional to
  the distance of the object from the sensor.
*/

const int triggerPin = 10, echoPin = 11;
const int settlingPin = 2, takePicturePin = 3;
const int generalIn = 4, generalOut = 5;


void setup() {
  Serial.begin(9600);
  pinMode(triggerPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(settlingPin, OUTPUT);
  pinMode(takePicturePin, OUTPUT);
  pinMode(generalIn, INPUT);
  pinMode(generalOut, OUTPUT);
}

float getDistance() {
  long duration;
  float inches, cm;
  // The PING))) is triggered by a HIGH pulse of 2 or more microseconds.
  // Give a short LOW pulse beforehand to ensure a clean HIGH pulse:
  digitalWrite(triggerPin, LOW);
  delayMicroseconds(2);
  digitalWrite(triggerPin, HIGH);
  delayMicroseconds(5);
  digitalWrite(triggerPin, LOW);

  /* The echo pin is used to read the signal from the PING))): a HIGH
    pulse whose duration is the time (in microseconds) from the sending
    of the ping to the reception of its echo off of an object.*/

  duration = pulseIn(echoPin, HIGH);

  // convert the time into a distance
  cm = duration / 29.0 / 2.0;
  inches = cm / 2.54;
  return inches;
}

int calibrate() {
  float ave = 0;
  const int N = 50;
  int i;

  delay(1000);
  Serial.println("Waiting for life to calm down...");
  delay(4000);
  Serial.println("Commencing calibration.");

  for (i = 0; i < 200; ++i) {
    float inches = getDistance();

    ave -= ave / N;
    ave += inches / N;
    Serial.print("Current: ");
    Serial.print(inches);
    Serial.print(" Ave: ");
    Serial.println(ave);
    delay(30);
  }
  return (int)ave;
}

void snapshot() {
  Serial.println("Snapshot!");
  // digitalWrite(takePicturePin, HIGH);
  // delay(4000); // hold it for 4 seconds
  // digitalWrite(takePicturePin, LOW);
}

void loop() {
  int normal, diffCount = 0;
  const int threshold = 12; // must be 1 foot off of normal to trigger picture
  const int numDiffsThreshold = 4; // must be over threshold 4 times in a row to trigger picture

  digitalWrite(settlingPin, HIGH);
  normal = calibrate();
  digitalWrite(settlingPin, LOW);

  for (;;) {
    int inches;

    if (digitalRead(generalIn)) {
      Serial.println("Got break signal! Will recalibrate...");
      break;
    }

    inches = (int) getDistance();
    Serial.print("inches=");
    Serial.print(inches);
    Serial.print(" normal=");
    Serial.print(normal);
    Serial.print(" diffCount=");
    Serial.println(diffCount);
    delay(500);
    if (abs(inches - normal) >= threshold) {
      diffCount++;
      if (diffCount >= numDiffsThreshold) {
        snapshot();
        diffCount = 0;
      }
    } else {
      diffCount = 0;
    }
  }
}
