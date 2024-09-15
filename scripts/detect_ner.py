import spacy
import sys
import json

# Load the spaCy model
nlp = spacy.load("en_core_web_sm")

# Maximum length of text for spaCy processing
CHUNK_SIZE = 2000

def detect_entities(text):
    doc = nlp(text)
    entities = []
    for ent in doc.ents:
        if ent.label_ in ["PERSON", "GPE"]:
            entities.append({"type": ent.label_, "value": ent.text, "start": ent.start_char, "end": ent.end_char})
    return entities

def process_text_in_chunks(text, chunk_size=CHUNK_SIZE):
    entities = []
    for start in range(0, len(text), chunk_size):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        entities.extend(detect_entities(chunk))
    return entities

def main(input_file, output_file, output_file_2):
    # Write initial processing message
    with open(output_file, 'w') as file:
        json.dump({"verdict": "Processing"}, file, indent=4)
    
    # Read the input file
    with open(input_file, 'r') as file:
        text = file.read()

    # Process the text
    entities = process_text_in_chunks(text)

    # Read the results from output_file_2
    try:
        with open(output_file_2, 'r') as file:
            additional_results = json.load(file)
    except FileNotFoundError:
        additional_results = []

    # Append additional results to the entities
    entities.extend(additional_results)

    # Write final results to output_file
    with open(output_file, 'w') as file:
        json.dump({"verdict": "Processed", "entities": entities}, file, indent=4)

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 4:
        print("Usage: python script.py <input_file> <output_file> <output_file_2>")
    else:
        main(sys.argv[1], sys.argv[2], sys.argv[3])
