/**
 * Dynamic Guardian – Smart Driver & Vehicle Dashboard
 * ---------------------------------------------------
 * • Real-time Edge Impulse inferencing with LVGL visualization
 * • Sends driver condition metrics (fatigue, stress, road, braking) to Firebase
 * • Continuously tracks and reports model latency, sampling rate, and cloud upload time
 * • Designed for LilyGo T-Display-S3 with AMOLED screen
 *
 * Author: Chaitanya Srivastava
 * Version: 1.4 (with latency and performance tracking)
 */

#include <LilyGo_AMOLED.h>
#include <LV_Helper.h>
#include <Edge_device_inferencing.h>   // Edge Impulse model header
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/RTDBHelper.h>

// ------------------- CONFIG -------------------
#define WIFI_SSID       "Chaitanya"
#define WIFI_PASSWORD   "chaitanya"

#define API_KEY         "AIzaSyAuNrkjHb5_GbGdEQqarokhSxxZz-IL51c"
#define DATABASE_URL    "https://edgedevice-default-rtdb.firebaseio.com/"

#define NUM_FEATURES            19
#define SAMPLE_INTERVAL_MS      500
#define WINDOW_SIZE             10
#define SERIAL_UPDATE_INTERVAL  5000
#define DISPLAY_UPDATE_INTERVAL 10000

// ---------------- Firebase objects ----------------
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ---------------- performance tracking ----------------
unsigned long fb_latency = 0;           // Firebase transmission latency
unsigned long model_latency = 0;        // Inference (Edge Impulse) time
unsigned long sampling_rate_ms = 0;     // Actual data sampling rate
unsigned long last_sample_timestamp = 0;

// ---------------- scaler arrays (from JSON) ----------------
float scaler_mean[NUM_FEATURES] = {
  76.1575,53.0394,15.0943,0.2383,25.8934,7.3105,8.8227,0.1556,
  910.9779,21.0823,70.6051,58.7550,3.8114,0.7571,45.5006,-0.3129,
  31.3651,17.1127,95.0041
};
float scaler_scale[NUM_FEATURES] = {
  17.7446,19.2301,9.4011,9.5678,9.0512,19.9879,3.7180,28.5111,
  652.2897,2.0177,4.5136,22.4145,0.2009,2.2880,10.2013,1.4075,
  3.5470,8.0307,1.7423
};

// ---------------- state ----------------
float window_buffer[WINDOW_SIZE][NUM_FEATURES];
int window_index = 0;
unsigned long lastSampleTime = 0;
unsigned long lastSerialTime = 0;
unsigned long lastDisplayTime = 0;

// ---------------- LVGL UI objects ----------------
LilyGo_AMOLED tft;
lv_obj_t *label_title, *bar_fatigue, *bar_stress, *label_pct_f, *label_pct_s;
lv_obj_t *chart, *label_status_f, *label_status_s, *label_status_r, *label_status_b;
lv_chart_series_t *series_brake, *series_pothole;

// ---------------- helpers ----------------
float randf(float a, float b) { return a + ((float)rand() / RAND_MAX) * (b - a); }
float scale_feature(float raw, int i) { return (raw - scaler_mean[i]) / scaler_scale[i]; }

void generate_live_reading(float *r) {
  for (int i=0;i<NUM_FEATURES;i++) r[i] = scaler_mean[i] + randf(-scaler_scale[i]*0.5, scaler_scale[i]*0.5);
  if (randf(0,1)>0.9){ r[1]=randf(18,35); r[8]=randf(2000,3000); r[0]=randf(60,80); }
  if (randf(0,1)>0.9){ r[0]=randf(95,115); r[10]=randf(80,95); r[3]=randf(-8,8); }
  if (randf(0,1)>0.9){ r[5]=randf(20,45); r[7]=randf(8,30); }
  if (randf(0,1)>0.9){ r[13]=randf(2,7); }
}

// ---------------- UI ----------------
void ui_init() {
  lv_obj_t *scr = lv_scr_act();
  lv_obj_clear_flag(scr, LV_OBJ_FLAG_SCROLLABLE);

  label_title = lv_label_create(scr);
  lv_label_set_text(label_title, "Dynamic Guardian");
  lv_obj_set_style_text_font(label_title, &lv_font_montserrat_18, 0);
  lv_obj_align(label_title, LV_ALIGN_TOP_MID, 0, 6);

  lv_obj_t *lblF = lv_label_create(scr);
  lv_label_set_text(lblF, "Fatigue:");
  lv_obj_align(lblF, LV_ALIGN_LEFT_MID, 10, -20);

  bar_fatigue = lv_bar_create(scr);
  lv_obj_set_size(bar_fatigue, 200, 18);
  lv_obj_align(bar_fatigue, LV_ALIGN_LEFT_MID, 90, -20);
  lv_bar_set_range(bar_fatigue, 0, 100);
  label_pct_f = lv_label_create(scr);
  lv_obj_set_style_text_font(label_pct_f, &lv_font_montserrat_20, 0);
  lv_obj_align(label_pct_f, LV_ALIGN_LEFT_MID, 300, -20);
  lv_label_set_text(label_pct_f, "0%");

  lv_obj_t *lblS = lv_label_create(scr);
  lv_label_set_text(lblS, "Stress:");
  lv_obj_align(lblS, LV_ALIGN_LEFT_MID, 10, 10);

  bar_stress = lv_bar_create(scr);
  lv_obj_set_size(bar_stress, 200, 18);
  lv_obj_align(bar_stress, LV_ALIGN_LEFT_MID, 90, 10);
  lv_bar_set_range(bar_stress, 0, 100);
  label_pct_s = lv_label_create(scr);
  lv_obj_set_style_text_font(label_pct_s, &lv_font_montserrat_20, 0);
  lv_obj_align(label_pct_s, LV_ALIGN_LEFT_MID, 300, 10);
  lv_label_set_text(label_pct_s, "0%");

  chart = lv_chart_create(scr);
  lv_obj_set_size(chart, 200, 60);
  lv_obj_align(chart, LV_ALIGN_BOTTOM_LEFT, 10, -10);
  lv_chart_set_type(chart, LV_CHART_TYPE_LINE);
  lv_chart_set_point_count(chart, 20);
  lv_chart_set_range(chart, LV_CHART_AXIS_PRIMARY_Y, 0, 100);
  series_brake = lv_chart_add_series(chart, lv_color_hex(0xff3b30), LV_CHART_AXIS_PRIMARY_Y);
  series_pothole = lv_chart_add_series(chart, lv_color_hex(0xffc107), LV_CHART_AXIS_PRIMARY_Y);

  label_status_f = lv_label_create(scr);
  lv_label_set_text(label_status_f, "Fatigue: ...");
  lv_obj_align(label_status_f, LV_ALIGN_BOTTOM_RIGHT, -10, -55);

  label_status_s = lv_label_create(scr);
  lv_label_set_text(label_status_s, "Stress: ...");
  lv_obj_align(label_status_s, LV_ALIGN_BOTTOM_RIGHT, -10, -40);

  label_status_r = lv_label_create(scr);
  lv_label_set_text(label_status_r, "Road: ...");
  lv_obj_align(label_status_r, LV_ALIGN_BOTTOM_RIGHT, -10, -25);

  label_status_b = lv_label_create(scr);
  lv_label_set_text(label_status_b, "Braking: ...");
  lv_obj_align(label_status_b, LV_ALIGN_BOTTOM_RIGHT, -10, -10);
}

// ---------------- dashboard update ----------------
void update_dashboard(float fatigue, float stress, float pothole, float brake) {
  int f_pct = round(constrain(fatigue*100,0,100));
  int s_pct = round(constrain(stress*100,0,100));

  lv_bar_set_value(bar_fatigue, f_pct, LV_ANIM_ON);
  lv_bar_set_value(bar_stress, s_pct, LV_ANIM_ON);

  char buf[16];
  sprintf(buf, "%d%%", f_pct); lv_label_set_text(label_pct_f, buf);
  sprintf(buf, "%d%%", s_pct); lv_label_set_text(label_pct_s, buf);

  lv_chart_set_next_value(chart, series_brake, brake*100);
  lv_chart_set_next_value(chart, series_pothole, pothole*100);

  lv_label_set_text(label_status_f, fatigue>0.8 ? "Fatigue: Drowsy" : "Fatigue: Normal");
  lv_label_set_text(label_status_s, stress>0.7 ? "Stress: High" : "Stress: Normal");
  lv_label_set_text(label_status_r, pothole>0.6 ? "Road: Poor Condition" : "Road: Smooth");
  lv_label_set_text(label_status_b, brake>0.6 ? "Braking: Late" : "Braking: Normal");
}

// ---------------- inference + Firebase send ----------------
void run_inference_and_handle() {
  // Compute average feature vector across window
  float avg[NUM_FEATURES] = {0};
  for (int i=0;i<WINDOW_SIZE;i++)
    for (int j=0;j<NUM_FEATURES;j++)
      avg[j]+=window_buffer[i][j];
  for (int j=0;j<NUM_FEATURES;j++) avg[j]/=WINDOW_SIZE;

  float input_features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];
  for (int i=0;i<NUM_FEATURES;i++) input_features[i]=scale_feature(avg[i],i);
  signal_t signal; numpy::signal_from_buffer(input_features,EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE,&signal);

  // Measure model latency
  unsigned long t_start = micros();
  ei_impulse_result_t result; 
  EI_IMPULSE_ERROR r = run_classifier(&signal,&result,false);
  model_latency = (micros() - t_start) / 1000; // convert to ms

  if (r!=EI_IMPULSE_OK){ Serial.print("Inference error "); Serial.println((int)r); return; }

  float fatigue=result.classification[0].value;
  float stress=result.classification[1].value;
  float pothole=result.classification[2].value;
  float brake=result.classification[3].value;

  // Context-based adjustments
  if (avg[8]>2000) fatigue+=0.2;
  if (avg[1]<35) fatigue+=0.2;
  if (avg[0]>95) stress+=0.2;
  if (avg[10]>85) stress+=0.1;
  fatigue=min(1.0f,fatigue); stress=min(1.0f,stress);

  // --- Serial and Firebase update ---
  if (millis()-lastSerialTime>=SERIAL_UPDATE_INTERVAL) {
    const char* fatigue_str = fatigue>0.8 ? "High" : "Normal";
    const char* stress_str  = stress>0.7 ? "High" : "Normal";
    const char* road_str    = pothole>0.6 ? "Poor Condition" : "Smooth";
    const char* brake_str   = brake>0.6 ? "Late Braking" : "Normal";

    const char* overall;
    if (fatigue>0.8) overall="Driver drowsy — stop.";
    else if (stress>0.7) overall="Driver stressed — relax.";
    else if (pothole>0.6) overall="Poor road — drive carefully.";
    else if (brake>0.6) overall="Harsh braking observed.";
    else overall="Driver & vehicle normal.";

    Serial.printf("\n[Firebase] HR %.1f | HRV %.1f | CO2 %.1f\n",avg[0],avg[1],avg[8]);
    Serial.printf("Model Latency: %lu ms | Sampling Rate: %lu ms | Cloud TX: %lu ms\n",
                  model_latency, sampling_rate_ms, fb_latency);

    if (WiFi.status()==WL_CONNECTED && Firebase.ready()) {
      FirebaseJson json;
      json.set("avgHeartRate",avg[0]);
      json.set("avgHRV",avg[1]);
      json.set("avgCO2",avg[8]);
      json.set("fatigue",fatigue_str);
      json.set("stress",stress_str);
      json.set("road",road_str);
      json.set("braking",brake_str);
      json.set("overall",overall);

      // Performance metrics
      json.set("modelLatencyMs", model_latency);
      json.set("samplingRateMs", sampling_rate_ms);
      json.set("cloudLatencyMs", fb_latency);

      unsigned long fb_start=millis();
      bool ok=Firebase.RTDB.setJSON(&fbdo,"/guardianReport/latest",&json);
      fb_latency=millis()-fb_start;

      if (ok) Serial.printf("✅ Firebase OK (%lu ms)\n",fb_latency);
      else Serial.printf("❌ Firebase Error: %s\n",fbdo.errorReason().c_str());
    } else Serial.println("WiFi/Firebase not ready.");

    lastSerialTime=millis();
  }

  if (millis()-lastDisplayTime>=DISPLAY_UPDATE_INTERVAL) {
    update_dashboard(fatigue,stress,pothole,brake);
    lastDisplayTime=millis();
  }
}

// ---------------- setup ----------------
void setup() {
  Serial.begin(115200); delay(2000);
  Serial.println("\nDynamic Guardian setup...");

  tft.begin();
  beginLvglHelper(tft);
  ui_init();

  Serial.print("Connecting WiFi");
  WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
  unsigned long t0=millis();
  while(WiFi.status()!=WL_CONNECTED && millis()-t0<20000){ Serial.print("."); delay(500); }
  Serial.println();
  if(WiFi.status()==WL_CONNECTED){
    Serial.println("WiFi connected.");
    Serial.print("IP: "); Serial.println(WiFi.localIP());
  }else{
    Serial.println("WiFi failed, continue offline.");
  }

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  Firebase.reconnectWiFi(true);
  Firebase.begin(&config,&auth);

  if (Firebase.signInAnonymous(&config,&auth)) {
    Serial.println("Firebase anonymous sign-in OK.");
  } else {
    Serial.print("Firebase sign-in failed: ");
    Serial.println(config.signer.error.message.c_str());
  }

  randomSeed(analogRead(0));
  for(int i=0;i<WINDOW_SIZE;i++){ float r[NUM_FEATURES]; generate_live_reading(r); for(int j=0;j<NUM_FEATURES;j++) window_buffer[i][j]=r[j]; }

  last_sample_timestamp = millis();
  Serial.println("Setup done.");
}

// ---------------- loop ----------------
void loop() {
  if (millis()-lastSampleTime>=SAMPLE_INTERVAL_MS){
    // Measure actual sampling rate
    unsigned long now = millis();
    sampling_rate_ms = now - last_sample_timestamp;
    last_sample_timestamp = now;

    float r[NUM_FEATURES]; generate_live_reading(r);
    for(int j=0;j<NUM_FEATURES;j++) window_buffer[window_index][j]=r[j];
    window_index=(window_index+1)%WINDOW_SIZE;
    lastSampleTime=millis();
  }
  run_inference_and_handle();
  lv_task_handler();
  delay(5);
}

