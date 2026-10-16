// Two code-mixed regional calls for the seed (ADR-0014): Hindi-English and
// Telugu-English, the way Indian sales calls are actually spoken, with the
// English words agents use (policy, premium, sum assured, free look period)
// left in English. They are voiced with Sarvam Bulbul and loaded like the
// other seed calls, but stay out of the eval gate (run.ts reads CALLS only)
// until a judge pass on them is recorded.
import { A, C, type CallScript, labels } from "./scripts.ts";

export const REGIONAL: CallScript[] = [
  {
    id: "21-hindi-english-guaranteed-returns",
    title: "Hindi-English ULIP call: guaranteed returns promised, risk not disclosed",
    language: "hindi-english",
    languageCode: "hi-IN",
    product: "Suraksha ULIP",
    agentCode: "AG002",
    voices: { agent: "priya", customer: "rahul" },
    lines: [
      A(
        "नमस्ते, मैं Anita Sharma बोल रही हूँ Suraksha Life Insurance से. क्या मेरी बात Mr. Verma से हो रही है?",
      ),
      C("हाँ, बोलिए. किस बारे में call है?"),
      A("Sir, आपने website पर ULIP plan के बारे में callback request किया था."),
      C("हाँ हाँ, याद है. बताइए."),
      A("आगे बढ़ने से पहले, verification के लिए अपनी date of birth confirm कर दीजिए."),
      C("पंद्रह June, उन्नीस सौ अस्सी."),
      A("Thank you sir, details match हो गईं. आप mainly किस goal के लिए save कर रहे हैं?"),
      C("बेटे की higher education के लिए. वो अभी दस साल का है."),
      A(
        "Perfect. Suraksha ULIP में आपके premium का एक part life cover में जाता है और बाकी market funds में invest होता है.",
      ),
      C("Returns कितने मिलेंगे? Risk तो नहीं है?"),
      A(
        "Sir, यह plan हर साल बारह percent guaranteed returns देता है, कोई risk नहीं है.",
        "guaranteed_returns",
      ),
      C("अच्छा, वो तो बढ़िया है."),
      A(
        "Premium पचास हज़ार per year है, ten years के लिए. क्या मैं आपकी consent से proposal generate करूँ?",
      ),
      C("हाँ, आगे बढ़िए."),
      A(
        "Policy document मिलने के बाद आपके पास thirty days का free look period है, मन बदले तो पूरा refund मिल जाएगा.",
      ),
      C("ठीक है, thank you."),
      A("Thank you sir, आपका दिन शुभ हो."),
    ],
    labels: labels({ disclosure: "missed", guaranteed_returns: "breach" }),
  },
  {
    id: "22-telugu-english-clean-term",
    title: "Telugu-English term plan call: compliant",
    language: "telugu-english",
    languageCode: "te-IN",
    product: "Term Shield",
    agentCode: "AG003",
    voices: { agent: "aditya", customer: "kavya" },
    lines: [
      A(
        "నమస్కారం, నేను Suraksha Life Insurance నుండి Vikram మాట్లాడుతున్నాను. Mrs. Lakshmi గారితో మాట్లాడుతున్నానా?",
      ),
      C("అవునండి, చెప్పండి."),
      A("మీరు Term Shield plan గురించి website లో enquiry చేశారు, అందుకే call చేశాను."),
      C("అవును, details కావాలి."),
      A("ముందుగా verification కోసం మీ date of birth చెప్పగలరా?"),
      C("పన్నెండు March, పందొమ్మిది వందల ఎనభై ఐదు."),
      A("Thank you madam, details match అయ్యాయి. మీ income మీద family లో ఎవరు depend అవుతారు?"),
      C("నా భర్త, ఇద్దరు పిల్లలు."),
      A(
        "Term Shield ఒక pure term plan, ఇది investment కాదు, maturity లో ఎలాంటి returns రావు. Sum assured ఒక crore, premium సంవత్సరానికి పన్నెండు వేలు.",
      ),
      C("Claim ఎలా ఉంటుంది?"),
      A(
        "Policy term లో ఏదైనా జరిగితే nominee కి full sum assured వస్తుంది. Exclusions, waiting periods అన్నీ policy document లో clear గా ఉంటాయి.",
      ),
      C("సరే, proceed చేయండి."),
      A("మీ consent తో proposal generate చేస్తున్నాను, సరేనా?"),
      C("సరే."),
      A(
        "Policy document వచ్చాక thirty days free look period ఉంటుంది, నచ్చకపోతే cancel చేసి refund తీసుకోవచ్చు.",
      ),
      C("Thank you."),
      A("Thank you madam, మంచి రోజు."),
    ],
    labels: labels(),
  },
];
