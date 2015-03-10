package main

import (
	"encoding/xml"
	"fmt"
	"github.com/codegangsta/cli"
	"os"
)

func createFont(c *cli.Context) {
	// get input file name
	pFile := c.String("plist")
	if pFile == "" {
		fmt.Println("specify a plist file name for input")
	} else {
		if pFile[len(pFile)-6:] != ".plist" {
			pFile = pFile + ".plist"
		}
	}

	// get output file name
	fnt := c.String("fnt")
	if fnt == "" {
		fnt = pFile[:len(pFile)-6] + ".fnt"
	} else if fnt[len(fnt)-4:] != ".fnt" {
		fnt = fnt + ".fnt"
	}

	// open plist file
	pInput, err := os.Open(pFile)
	if err != nil {
		fmt.Println("Couldn't open ", pFile)
		return
	}
	defer pInput.Close()

	// retrieve XML
	pList := make(map[string]interface{})
	decoder := xml.NewDecoder(pInput)

	readToken(decoder, pList, "main")
	
	fmt.Println("===============================================")
	fmt.Println(pList)
}

func readToken(decoder *xml.Decoder, storage map[string]interface{}, key string) {

	token, err := decoder.Token()
	if token == nil {
		fmt.Println("End of XML file:", err.Error())
		return
	}

	switch elem := token.(type) {
	case xml.StartElement:
		name := elem.Name.Local
		fmt.Println("StartElement:", elem)
		switch name {
		case "plist":
			fmt.Println("Reading token Plist")
			newMap := make(map[string]interface{})
			storage["plist"] = newMap
			readToken(decoder, newMap, "")
		case "dict":
			fmt.Println("Reading token dict with key", key)
			newMap := make(map[string]interface{})
			storage[key] = newMap
			readToken(decoder, newMap, "")
		case "key":
			key = getElement(decoder)
			fmt.Println("New key:", key)
		case "string":
			storage[key] = getElement(decoder)
			fmt.Println("New string for", key, ":", storage[key])
		case "integer":
			storage[key] = getElement(decoder)
			fmt.Println("New integer for", key, ":", storage[key])
		case "false":
			storage[key] = false
			fmt.Println("New bool for", key, ": false")
		case "true":
			storage[key] = true
			fmt.Println("New bool for", key, ": true")
		case "array":
			//storage[key] = getArray(decoder)
			//fmt.Println("New array for", key)
			//return
		default:
			fmt.Println("Unknown type: " + name)
		}

		readToken(decoder, storage, key)
	case xml.EndElement:
		name := elem.Name.Local
		fmt.Println("Got EndElement:",name)
		if name != "dict" {
			readToken(decoder, storage, key)
		}
	case xml.CharData:
		fmt.Println("Got CharData:",string(elem))
		readToken(decoder, storage, key)
	default:
		fmt.Println("Got something else:",elem)
		readToken(decoder, storage, key)
	}
}

func getElement(decoder *xml.Decoder) string {
	token, _ := decoder.Token()
	var result string

	switch elem := token.(type) {
	case xml.CharData:
		result = string(elem)

		token, _ := decoder.Token()
		if token == nil {
			return ""
		}

		return result
	default:
		panic("Wrong element type. Supposed to be xml.CharData.")
	}
}

func getArray(decoder *xml.Decoder) []string {
	result := []string{}
	var token xml.Token
	var err error
	for {
		token, err = decoder.Token()
		if token == nil {
			fmt.Println("End of XML file:", err.Error())
			return result
		}

		switch elem := token.(type) {
		case xml.CharData:
			result = append(result, string(elem))
		case xml.EndElement:
			break
		default:
		}
	}

	return result
}
