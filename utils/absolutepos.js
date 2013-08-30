// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function getAbsoluteY(oElement)
{
	var iReturnValue = 0;
	while( oElement != null ) {
		iReturnValue += oElement.offsetTop;
		oElement = oElement.offsetParent;
		if (oElement != null) {
			iReturnValue -= oElement.scrollTop;
		}
	}
	return iReturnValue;
}

function getAbsoluteX(oElement)
{
	var iReturnValue = 0;
	while( oElement != null ) {
		iReturnValue += oElement.offsetLeft;
		oElement = oElement.offsetParent;
		if (oElement != null) {
			iReturnValue -= oElement.scrollLeft;
		}
	}
	return iReturnValue;
}
